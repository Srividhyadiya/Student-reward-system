import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './AddMarks.css';

const HIGH_SCORE_THRESHOLD = 85;

export default function AddMarks() {
  const { id: teacherId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const qs = new URLSearchParams(location.search);
  const slot = {
    day: qs.get('day') || '',
    start: qs.get('start') || '',
    end: qs.get('end') || '',
    subject: qs.get('subject') || '',
    department: qs.get('department') || '',
    semester: qs.get('semester') || '',
    section: qs.get('section') || ''
  };

  const defaultCycle = useMemo(() => {
    const year = new Date().getFullYear();
    const semPart = slot.semester ? `Sem${slot.semester}` : 'General';
    return `${year}-${semPart}`;
  }, [slot.semester]);

  const [cycleInput, setCycleInput] = useState(defaultCycle);
  const [evaluationCycle, setEvaluationCycle] = useState(defaultCycle);
  const [selectedSubject, setSelectedSubject] = useState(slot.subject || '');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [activeStudentKey, setActiveStudentKey] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const getStudentKey = (student) => String(student?._id || student?.roll || student?.email || '');

  useEffect(() => {
    setCycleInput(defaultCycle);
    setEvaluationCycle(defaultCycle);
  }, [defaultCycle]);

  useEffect(() => {
    let active = true;
    const loadTeacherSubjects = async () => {
      try {
        const res = await fetch(`/api/admin/teacher/${encodeURIComponent(teacherId)}`);
        const json = await res.json();
        if (!active || !res.ok || !json?.success) return;

        const fromTimetable = Array.isArray(json.teacher?.timetable)
          ? json.teacher.timetable.map((row) => String(row.subject || '').trim()).filter(Boolean)
          : [];
        const deduped = Array.from(new Set([slot.subject, ...fromTimetable].filter(Boolean)));
        setAvailableSubjects(deduped);
        if (!selectedSubject && deduped.length) setSelectedSubject(deduped[0]);
      } catch (err) {
        // keep fallback to slot.subject
      }
    };

    if (teacherId) loadTeacherSubjects();
    return () => { active = false; };
  }, [teacherId, slot.subject, selectedSubject]);

  useEffect(() => {
    if (!selectedSubject && slot.subject) setSelectedSubject(slot.subject);
  }, [selectedSubject, slot.subject]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!teacherId || !selectedSubject || !slot.department || !slot.semester) {
        setLoading(false);
        setError('Missing slot details. Please open Add Marks from a timetable row.');
        return;
      }

      setLoading(true);
      setError('');
      setNotice('');

      try {
        const params = new URLSearchParams({
          subject: selectedSubject,
          department: slot.department,
          semester: slot.semester,
          section: slot.section || '',
          evaluationCycle
        });

        const res = await fetch(`/api/admin/teacher/${encodeURIComponent(teacherId)}/marks/students?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json?.success) {
          setError(json?.message || 'Failed to load students for marks entry.');
          setStudents([]);
          return;
        }

        setStudents((json.students || []).map((student) => ({
          ...student,
          selected: false,
          marksObtained: typeof student.marksObtained === 'number' ? String(student.marksObtained) : '',
          totalMarks: typeof student.totalMarks === 'number' ? String(student.totalMarks) : '100'
        })));
        setActiveStudentKey('');
      } catch (err) {
        console.error('Failed to load marks roster', err);
        setError('Server error while loading students.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [teacherId, selectedSubject, slot.department, slot.semester, slot.section, evaluationCycle]);

  const getInitials = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const updateStudentField = (studentId, key, value) => {
    setStudents((prev) => prev.map((student) => (
      getStudentKey(student) === studentId ? { ...student, [key]: value } : student
    )));
  };

  const selectStudentByKey = (studentKey) => {
    setActiveStudentKey(studentKey);
    setStudents((prev) => prev.map((student) => ({
      ...student,
      selected: getStudentKey(student) === studentKey
    })));
  };

  const rowPercent = (student) => {
    const obtained = Number(student.marksObtained);
    const total = Number(student.totalMarks);
    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) return null;
    return Math.round((obtained / total) * 100);
  };

  const selectedStudents = students.filter((student) => student.selected);
  const filledSelectedStudents = selectedStudents.filter((student) => {
    const obtained = Number(student.marksObtained);
    const total = Number(student.totalMarks);
    return String(student.marksObtained).trim() && Number.isFinite(obtained) && Number.isFinite(total) && total > 0;
  });
  const highScorerCount = filledSelectedStudents.filter((student) => {
    const pct = rowPercent(student);
    return pct !== null && pct >= HIGH_SCORE_THRESHOLD;
  }).length;
  const averagePercentage = filledSelectedStudents.length
    ? Math.round(filledSelectedStudents.reduce((sum, student) => sum + (rowPercent(student) || 0), 0) / filledSelectedStudents.length)
    : 0;
  const completionPercent = selectedStudents.length
    ? Math.round((filledSelectedStudents.length / selectedStudents.length) * 100)
    : 0;

  const applyCycle = () => {
    const next = cycleInput.trim() || defaultCycle;
    setEvaluationCycle(next);
  };

  const saveMarks = async () => {
    setError('');
    setNotice('');

    const prepared = [];
    for (const student of students) {
      if (!student.selected) continue;
      const obtained = Number(student.marksObtained);
      const total = Number(student.totalMarks);
      if (!String(student.marksObtained).trim()) {
        setError(`Enter marks for selected student ${student.name || student.roll || ''}.`);
        return;
      }
      if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
        setError(`Invalid marks for ${student.name || student.roll || 'a student'}.`);
        return;
      }
      prepared.push({
        studentId: student._id || student.roll,
        marksObtained: obtained,
        totalMarks: total
      });
    }

    if (!prepared.length) {
      setError('Select at least one student and enter marks before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/teacher/${encodeURIComponent(teacherId)}/marks/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          department: slot.department,
          semester: slot.semester,
          section: slot.section || '',
          evaluationCycle,
          marksList: prepared
        })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || 'Failed to save marks.');
        return;
      }

      const rewardText = json.rewardedCount > 0
        ? ` ${json.rewardedCount} students received ${json.rewardCoins || 0} EduCoins for high marks.`
        : ' No EduCoin rewards in this save cycle.';
      setNotice(`Marks saved successfully for ${json.savedCount || prepared.length} students.${rewardText}`);
      applyCycle();
    } catch (err) {
      console.error('Failed to save marks', err);
      setError('Server error while saving marks.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tm-page">
      <div className="tm-page-orb tm-page-orb-left" aria-hidden="true" />
      <div className="tm-page-orb tm-page-orb-right" aria-hidden="true" />

      <div className="tm-container">
        <section className="tm-hero-card">
          <p className="tm-kicker">Assessment Console</p>
          <h1 className="tm-title">Add Marks</h1>
          <p className="tm-subtitle">
            {selectedSubject || slot.subject || 'Subject'}
            <span className="tm-dot">•</span>
            {slot.day || 'Day not set'}
            <span className="tm-dot">•</span>
            {slot.start || '--:--'} - {slot.end || '--:--'}
          </p>

          <div className="tm-meta-grid">
            <div className="tm-meta-item"><span>Subject</span><strong>{selectedSubject || '—'}</strong></div>
            <div className="tm-meta-item"><span>Department</span><strong>{slot.department || '—'}</strong></div>
            <div className="tm-meta-item"><span>Semester</span><strong>{slot.semester || '—'}</strong></div>
            <div className="tm-meta-item"><span>Section</span><strong>{slot.section || '—'}</strong></div>
            <div className="tm-meta-item"><span>Reward Rule</span><strong>{HIGH_SCORE_THRESHOLD}%+ earns EduCoins</strong></div>
          </div>
        </section>

        <section className="tm-controls-card">
          <div className="tm-filters-grid">
            <div className="tm-filter-box">
              <label htmlFor="marksSubject">Subject</label>
              <select
                id="marksSubject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="tm-subject-select"
              >
                {(availableSubjects.length ? availableSubjects : [slot.subject]).filter(Boolean).map((subjectOption) => (
                  <option key={subjectOption} value={subjectOption}>{subjectOption}</option>
                ))}
              </select>
            </div>

            <div className="tm-filter-box">
              <label htmlFor="marksStudent">Student Name</label>
              <select
                id="marksStudent"
                value={activeStudentKey}
                onChange={(e) => selectStudentByKey(e.target.value)}
                className="tm-subject-select"
              >
                <option value="">Select student name</option>
                {students.map((student) => {
                  const key = getStudentKey(student);
                  return (
                    <option key={key} value={key}>
                      {student.name || 'Unknown Student'} ({student.roll || 'USN N/A'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="tm-cycle-box">
              <label htmlFor="evaluationCycle">Evaluation Cycle</label>
              <div className="tm-cycle-input-wrap">
                <input
                  id="evaluationCycle"
                  value={cycleInput}
                  onChange={(e) => setCycleInput(e.target.value)}
                  placeholder="Example: 2026-Sem6-Internal1"
                />
                <button type="button" onClick={applyCycle}>Load Cycle</button>
              </div>
            </div>
          </div>

          <p className="tm-selection-note">Select students first, then award marks for selected rows in the chosen subject.</p>

          {error && <p className="tm-alert tm-alert-error">{error}</p>}
          {notice && <p className="tm-alert tm-alert-success">{notice}</p>}
        </section>

        <section className="tm-summary-grid" aria-label="Subject wise marks summary">
          <article className="tm-summary-card">
            <p>Selected Students</p>
            <h3>{selectedStudents.length}</h3>
            <span>for {selectedSubject || 'current subject'}</span>
          </article>
          <article className="tm-summary-card">
            <p>Marks Entered</p>
            <h3>{filledSelectedStudents.length}</h3>
            <span>{completionPercent}% completion</span>
          </article>
          <article className="tm-summary-card">
            <p>Average Score</p>
            <h3>{averagePercentage}%</h3>
            <span>selected students only</span>
          </article>
          <article className="tm-summary-card">
            <p>High Scorers</p>
            <h3>{highScorerCount}</h3>
            <span>{HIGH_SCORE_THRESHOLD}% and above</span>
          </article>
        </section>

        <section className="tm-table-card">
          {loading ? (
            <div className="tm-state">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="tm-state">No students found for this class selection.</div>
          ) : (
            <div className="tm-table-wrap">
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Photo</th>
                    <th>Student Name</th>
                    <th>USN</th>
                    <th>Subject</th>
                    <th>Email</th>
                    <th>Add Marks</th>
                    <th>Total Marks</th>
                    <th>Percent</th>
                    <th>EduCoin</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentKey = getStudentKey(student);
                    const percent = rowPercent(student);
                    const isHighScorer = percent !== null && percent >= HIGH_SCORE_THRESHOLD;
                    return (
                      <tr key={studentKey} className={!student.selected ? 'tm-row-unselected' : ''}>
                        <td>
                          <input
                            type="radio"
                            name="selectedStudent"
                            className="tm-select-check"
                            checked={Boolean(student.selected)}
                            onChange={() => selectStudentByKey(studentKey)}
                            aria-label={`Select ${student.name || 'student'}`}
                          />
                        </td>
                        <td>
                          {student.imageUrl ? (
                            <img src={student.imageUrl} alt={student.name} className="tm-student-photo" />
                          ) : (
                            <div className="tm-student-photo tm-student-photo-placeholder">{getInitials(student.name)}</div>
                          )}
                        </td>
                        <td>
                          <p className="tm-student-name">{student.name || 'Unknown Student'}</p>
                          <p className="tm-student-extra">{student.dept || slot.department || 'Department N/A'}</p>
                        </td>
                        <td><span className="tm-student-usn">{student.roll || '-'}</span></td>
                        <td className="tm-subject-cell">{selectedSubject || '-'}</td>
                        <td className="tm-email">{student.email || '-'}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="tm-input"
                            value={student.marksObtained}
                            onChange={(e) => updateStudentField(studentKey, 'marksObtained', e.target.value)}
                            placeholder="0"
                            disabled={!student.selected}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="tm-input"
                            value={student.totalMarks}
                            onChange={(e) => updateStudentField(studentKey, 'totalMarks', e.target.value)}
                            placeholder="100"
                            disabled={!student.selected}
                          />
                        </td>
                        <td>
                          <span className={`tm-percent ${percent !== null && percent < HIGH_SCORE_THRESHOLD ? 'tm-percent-low' : ''}`}>
                            {percent === null ? '-' : `${percent}%`}
                          </span>
                        </td>
                        <td>
                          <span className={`tm-reward-tag ${isHighScorer ? 'is-reward' : ''}`}>
                            {isHighScorer ? 'Eligible' : 'No reward'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="tm-footer-actions">
            <button type="button" className="tm-btn tm-btn-primary" onClick={saveMarks} disabled={saving || loading}>
              {saving ? 'Saving Marks...' : 'Save Marks'}
            </button>
            <button type="button" className="tm-btn tm-btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
