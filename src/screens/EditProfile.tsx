import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser } from '../lib/store';
import { Field, Input, Textarea, UploadBox, toast, Avatar } from '../components/ui';
import { IconBack } from '../components/icons';
import { SKILLS, FACULTIES, DEPARTMENTS, LEVELS } from '../lib/domain';

export default function EditProfile() {
  const { actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const [form, setForm] = useState(() => ({
    displayName: me?.displayName ?? '',
    bio: me?.bio ?? '',
    faculty: me?.faculty ?? '',
    department: me?.department ?? '',
    level: me?.level ?? '',
    showDepartment: me?.showDepartment ?? false,
  }));
  const [skills, setSkills] = useState<string[]>(me?.skills ?? []);

  if (!me) return null;

  const toggleSkill = (s: string) => {
    setSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 5) { toast('You can pick up to 5 skills', 'error'); return prev; }
      return [...prev, s];
    });
  };

  const save = () => {
    actions.updateProfile({
      displayName: form.displayName.trim() || undefined,
      bio: form.bio.trim(),
      faculty: form.faculty,
      department: form.department,
      level: form.level,
      showDepartment: form.showDepartment,
      skills,
    });
    toast('Profile saved', 'success');
    nav('/app/passport');
  };

  return (
    <div>
      <div className="screen-header">
        <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
        <h1>Edit profile</h1>
        <span />
      </div>
      <div style={{ padding: '4px 16px' }}>
        <div className="row" style={{ gap: 14, marginBottom: 18 }}>
          <Avatar user={me} size="xl" showVerified />
          <div className="col" style={{ gap: 4 }}>
            <span className="strong" style={{ color: 'var(--navy)' }}>Profile photo</span>
            <span className="subtle" style={{ fontSize: 12.5, maxWidth: 210 }}>Your real first name and photo build trust — your legal name, matric number and ID are never public.</span>
          </div>
        </div>

        <Field label="Display name" hint="Shown on your Passport instead of your full legal name.">
          <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Salawu D." />
        </Field>
        <Field label="Bio" hint="What you do, what you’re building proof in.">
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="e.g. Graphic designer on UNILAG campus. Two Faculty Week campaigns with verified GrowthProof." maxLength={220} />
        </Field>
        <div className="grid-2">
          <Field label="Faculty">
            <select className="select" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
              <option value="">Not set</option>
              {FACULTIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Level">
            <select className="select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="">Not set</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Department">
          <select className="select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">Not set</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <label className="check-row" style={{ marginBottom: 18 }} onClick={() => setForm({ ...form, showDepartment: !form.showDepartment })}>
          <span className="radio-dot" />
          <span>
            <span className="strong" style={{ fontSize: 14 }}>Show my department publicly</span>
            <span className="subtle" style={{ display: 'block', fontSize: 12 }}>Optional — helps vendors find you for creator tasks. Never your matric number or ID.</span>
          </span>
        </label>

        <Field label="Skills" hint={`Pick up to 5 — used to recommend Campaigns. ${skills.length}/5 chosen`}>
          <div className="row wrap" style={{ gap: 7 }}>
            {SKILLS.map((s) => (
              <button key={s} className={`chip ${skills.includes(s) ? 'active' : ''}`} onClick={() => toggleSkill(s)}>{s}</button>
            ))}
          </div>
        </Field>

        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }} onClick={save}>Save profile</button>
        <p className="subtle ta-center" style={{ margin: '12px 0 20px', fontSize: 12 }}>
          Changing your display name never hides verification — your badge stays tied to your verified identity.
        </p>
      </div>
    </div>
  );
}
