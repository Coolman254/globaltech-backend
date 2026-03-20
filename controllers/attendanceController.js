import Student    from "../models/Student.js";
import Teacher    from "../models/Teacher.js";
import Attendance from "../models/Attendance.js";

// ── Helper: get Teacher doc from JWT ──────────────────────────────────────────
const getTeacherDoc = async (req) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) return null;

  let teacher = await Teacher.findOne({ userId }).lean(false);
  if (teacher) return teacher;

  const User_ = (await import("../models/User.js")).default;
  const userDoc = await User_.findById(userId).select("email").lean();
  if (!userDoc?.email) return null;

  teacher = await Teacher.findOne({ email: userDoc.email.toLowerCase() }).lean(false);
  return teacher ?? null;
};

// ── Normalise a date to midnight UTC ─────────────────────────────────────────
const toDay = (d) => {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER: GET /api/teacher-dashboard/attendance
// Returns all students in teacher's classes + today's attendance status
// Query: ?date=YYYY-MM-DD  (defaults to today)
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceForMarking = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map(c => c.trim()).filter(Boolean)
      : [];

    if (!classList.length) {
      return res.json({ success: true, data: { date: new Date(), students: [], records: {} } });
    }

    const date = req.query.date ? toDay(req.query.date) : toDay(new Date());

    const [students, existing] = await Promise.all([
      Student.find({ class: { $in: classList } }).sort({ firstName: 1 }).lean(),
      Attendance.find({
        class: { $in: classList },
        date,
      }).lean(),
    ]);

    // Map studentId → attendance record for easy frontend lookup
    const records = {};
    existing.forEach(r => { records[r.student.toString()] = r; });

    res.json({ success: true, data: { date, students, records } });
  } catch (err) {
    console.error("getAttendanceForMarking:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER: POST /api/teacher-dashboard/attendance
// Body: { date, records: [{ studentId, status, remarks }] }
// Upserts one record per student (allows re-marking the same day)
// ─────────────────────────────────────────────────────────────────────────────
export const markAttendance = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { date, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "date and records[] are required" });
    }

    const day = toDay(date);

    // Verify all students belong to this teacher's classes
    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map(c => c.trim()).filter(Boolean)
      : [];

    const studentIds = records.map(r => r.studentId);
    const students   = await Student.find({ _id: { $in: studentIds } }).lean();
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const ops = records.map(r => {
      const student = studentMap[r.studentId];
      if (!student) return null;
      if (!classList.includes(student.class)) return null; // security check

      return {
        updateOne: {
          filter: { student: r.studentId, date: day },
          update: {
            $set: {
              student:  r.studentId,
              class:    student.class,
              date:     day,
              status:   r.status,
              remarks:  r.remarks ?? "",
              markedBy: teacher._id,
            },
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: "No valid records to save" });
    }

    await Attendance.bulkWrite(ops);

    res.json({
      success: true,
      message: `Attendance marked for ${ops.length} student(s)`,
      data:    { date: day, count: ops.length },
    });
  } catch (err) {
    console.error("markAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET /api/admin-dashboard/attendance
// Query: ?class=Form1&date=YYYY-MM-DD&studentId=xxx
// Returns records + summary stats
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.class)     filter.class   = req.query.class;
    if (req.query.studentId) filter.student = req.query.studentId;
    if (req.query.date) {
      filter.date = toDay(req.query.date);
    } else if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = toDay(req.query.from);
      if (req.query.to)   filter.date.$lte = toDay(req.query.to);
    }

    const records = await Attendance.find(filter)
      .populate("student",  "firstName lastName admissionNo class")
      .populate("markedBy", "firstName lastName")
      .sort({ date: -1 })
      .limit(500)
      .lean();

    // Summary
    const total   = records.length;
    const present = records.filter(r => r.status === "present").length;
    const absent  = records.filter(r => r.status === "absent").length;
    const late    = records.filter(r => r.status === "late").length;

    res.json({
      success: true,
      data: {
        records,
        summary: { total, present, absent, late,
          rate: total ? Math.round((present / total) * 100) : 0 },
      },
    });
  } catch (err) {
    console.error("adminGetAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: PUT /api/admin-dashboard/attendance/:id
// Body: { status, remarks }
// ─────────────────────────────────────────────────────────────────────────────
export const adminUpdateAttendance = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });

    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { status, remarks: remarks ?? "" } },
      { new: true, runValidators: true }
    ).populate("student", "firstName lastName admissionNo class");

    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    res.json({ success: true, data: record });
  } catch (err) {
    console.error("adminUpdateAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: DELETE /api/admin-dashboard/attendance/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminDeleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Attendance record deleted" });
  } catch (err) {
    console.error("adminDeleteAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: POST /api/admin-dashboard/attendance
// Allows admin to manually create/upsert a single attendance record
// Body: { studentId, date, status, remarks }
// ─────────────────────────────────────────────────────────────────────────────
export const adminMarkAttendance = async (req, res) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ success: false, message: "studentId, date and status are required" });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const day = toDay(date);

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date: day },
      { $set: { student: studentId, class: student.class, date: day, status, remarks: remarks ?? "" } },
      { new: true, upsert: true, runValidators: true }
    ).populate("student", "firstName lastName admissionNo class");

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error("adminMarkAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
