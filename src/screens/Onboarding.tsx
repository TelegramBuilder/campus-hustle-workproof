import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, landingPath } from '../lib/store';
import { Field, Input, Select, UploadBox, LogoMark, toast } from '../components/ui';
import { FACULTIES, DEPARTMENTS, LEVELS, SKILLS } from '../lib/domain';
import { IconCheck } from '../components/icons';

const EXPLAIN = [
  { emoji: '🎯', title: 'Earn real proof on campus', text: 'Student vendors post Campaigns — sales, leads, tickets or creative tasks. Join one that fits your skills, do the work, and the vendor confirms every result.' },
  { emoji: '📗', title: 'Build a verified GrowthProof Passport', text: 'Vendor-confirmed results become verified entries — with your role, skills, rating and the vendor’s feedback. Proof that travels with you.' },
  { emoji: '🚀', title: 'Level up & unlock better work', text: 'Grow from Explorer to Trusted Specialist and let your record — not your claims — open the next opportunity.' },
];

export default function Onboarding() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const step = currentUser() ? (state.onboardingStep === 'splash' ? 'skills' : state.onboardingStep) : state.onboardingStep;
  const me = currentUser();

  const [f, setF] = useState({
    firstName: '', lastName: '', displayName: '', username: '', email: '', phone: '', password: '',
    faculty: '', department: '', level: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matric, setMatric] = useState('');
  const [idDoc, setIdDoc] = useState('');
  const [selfie, setSelfie] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const campus = state.campuses.find((c) => c.id === state.onboardingCampusId) ?? state.campuses[0];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const signup = () => {
    const errs: Record<string, string> = {};
    if (f.firstName.trim().length < 2) errs.firstName = 'Enter your first name';
    if (f.lastName.trim().length < 2) errs.lastName = 'Enter your last name';
    if (f.username.trim().length < 3) errs.username = 'Choose a username (min 3 characters)';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email address';
    if (!/^0\d{10}$/.test(f.phone.replace(/\s/g, ''))) errs.phone = 'Enter a valid Nigerian number, e.g. 08012345678';
    if (f.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!f.faculty) errs.faculty = 'Select your faculty';
    if (!f.department) errs.department = 'Select your department';
    if (!f.level) errs.level = 'Select your level';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const err = actions.register({
      firstName: f.firstName, lastName: f.lastName, displayName: f.displayName, username: f.username,
      email: f.email, phone: f.phone, password: f.password, campusId: campus.id,
      faculty: f.faculty, department: f.department, level: f.level,
    });
    if (err) { toast(err, 'error'); return; }
    toast('Account created — now verify your student identity', 'success');
  };

  const verify = () => {
    if (!/^\d{6,10}$/.test(matric.replace(/\s/g, ''))) { toast('Enter your matric / admission number', 'error'); return; }
    if (!idDoc || !selfie) { toast('Attach your student ID and selfie', 'error'); return; }
    const err = actions.submitVerification({ matricNo: matric.trim(), idDocumentName: idDoc, selfieName: selfie });
    if (err) { toast(err, 'error'); return; }
    if (currentUser()?.verificationStatus !== 'verified') {
      actions.setOnboarding('skills');
      toast('Documents submitted — you can pick skills while we verify (usually under 24h)', 'success');
    }
  };

  const saveSkills = () => {
    if (skills.length === 0) { toast('Pick at least one skill', 'error'); return; }
    actions.setSkills(skills);
    actions.completeOnboarding();
    toast('Welcome to GrowthProof 🎉', 'success');
    nav(landingPath(currentUser()));
  };

  const toggleSkill = (s: string) => {
    setSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length >= 5 ? p : [...p, s]));
  };

  const labels: Record<string, string> = {
    explain: 'How GrowthProof works',
    campus: 'Choose your campus',
    signup: 'Create your account',
    verify: 'Verify your student identity',
    skills: 'Choose your skills',
  };
  const currentStep = ['explain', 'campus', 'signup', 'verify', 'skills'].indexOf(step) + 1;

  return (
    <div className="onboard">
      <div className="row" style={{ marginBottom: 4, justifyContent: 'space-between' }}>
        <div className="row">
          <LogoMark size={34} />
          <div>
            <div className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>{labels[step] ?? 'Onboarding'}</div>
            <div className="subtle">Step {currentStep} of 5</div>
          </div>
        </div>
        {me && (
          <button className="btn btn-sm btn-soft" onClick={() => { actions.completeOnboarding(); nav(landingPath(currentUser())); }}>
            Skip for now
          </button>
        )}
      </div>

      {/* 1 — EXPLAIN */}
      {step === 'explain' && (
        <div style={{ marginTop: 18 }}>
          <div className="col" style={{ gap: 12 }}>
            {EXPLAIN.map((e, i) => (
              <div key={i} className="card card-pad row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <span className="row" style={{ width: 48, height: 48, borderRadius: 16, background: i === 2 ? 'var(--gold-soft)' : 'var(--green-soft)', justifyContent: 'center', fontSize: 22, flex: 'none' }}>{e.emoji}</span>
                <div>
                  <h3 style={{ fontSize: 15 }}>{i + 1}. {e.title}</h3>
                  <p className="subtle" style={{ fontSize: 13, marginTop: 4 }}>{e.text}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={() => actions.setOnboarding('campus')}>Continue</button>
        </div>
      )}

      {/* 2 — CAMPUS */}
      {step === 'campus' && (
        <div style={{ marginTop: 18 }}>
          <div className="card card-pad" style={{ borderColor: 'var(--green-mist)', borderWidth: 1.5 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="row" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--green)', color: '#fff', justifyContent: 'center', fontSize: 20 }}>🎓</span>
              <div>
                <div className="strong" style={{ color: 'var(--navy)', fontSize: 16 }}>{campus.name}</div>
                <div className="subtle">{campus.city}, {campus.country}</div>
              </div>
            </div>
            <div className="earn-line" style={{ marginTop: 12 }}>
              ✅ Currently available only for verified UNILAG students
            </div>
          </div>
          <p className="subtle" style={{ marginTop: 14, fontSize: 13 }}>
            CampusHustle GrowthProof starts with University of Lagos only. Every Campaign comes from a verified UNILAG club, faculty group or committee.
          </p>
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={() => actions.setOnboarding('signup', campus.id)}>Continue</button>
        </div>
      )}

      {/* 3 — SIGNUP */}
      {step === 'signup' && (
        <div style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <div className="grow">
              <Field label="First name"><Input placeholder="Salawu" value={f.firstName} onChange={set('firstName')} className={errors.firstName ? 'input-error' : ''} />{errors.firstName && <span className="error-text">{errors.firstName}</span>}</Field>
            </div>
            <div className="grow">
              <Field label="Last name"><Input placeholder="Oladipo" value={f.lastName} onChange={set('lastName')} className={errors.lastName ? 'input-error' : ''} />{errors.lastName && <span className="error-text">{errors.lastName}</span>}</Field>
            </div>
          </div>
          <Field label="Display name" hint="Shown publicly instead of your full legal name.">
            <Input placeholder="e.g. Salawu" value={f.displayName} onChange={set('displayName')} />
          </Field>
          <Field label="Username"><Input placeholder="salawu" value={f.username} onChange={set('username')} className={errors.username ? 'input-error' : ''} />{errors.username && <span className="error-text">{errors.username}</span>}</Field>
          <Field label="Email"><Input placeholder="you@student.unilag.edu.ng" type="email" value={f.email} onChange={set('email')} className={errors.email ? 'input-error' : ''} />{errors.email && <span className="error-text">{errors.email}</span>}</Field>
          <Field label="Phone number" hint="Never shown on your public profile."><Input placeholder="08012345678" inputMode="tel" value={f.phone} onChange={set('phone')} className={errors.phone ? 'input-error' : ''} />{errors.phone && <span className="error-text">{errors.phone}</span>}</Field>
          <Field label="Password"><Input type="password" placeholder="At least 6 characters" value={f.password} onChange={set('password')} className={errors.password ? 'input-error' : ''} />{errors.password && <span className="error-text">{errors.password}</span>}</Field>
          <Field label="Faculty">
            <Select value={f.faculty} onChange={set('faculty')} className={errors.faculty ? 'input-error' : ''}>
              <option value="">Select…</option>
              {FACULTIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
            {errors.faculty && <span className="error-text">{errors.faculty}</span>}
          </Field>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <div className="grow">
              <Field label="Department">
                <Select value={f.department} onChange={set('department')} className={errors.department ? 'input-error' : ''}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
                {errors.department && <span className="error-text">{errors.department}</span>}
              </Field>
            </div>
            <div className="grow">
              <Field label="Level">
                <Select value={f.level} onChange={set('level')} className={errors.level ? 'input-error' : ''}>
                  <option value="">Select…</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
                {errors.level && <span className="error-text">{errors.level}</span>}
              </Field>
            </div>
          </div>
          <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 16px' }}>
            Your ID, matric number and phone are never shown publicly. No outsiders, businesses or employers — verified UNILAG students only.
          </p>
          <button className="btn btn-primary btn-lg btn-block" onClick={signup}>Create account</button>
        </div>
      )}

      {/* 4 — VERIFY */}
      {step === 'verify' && (
        <div style={{ marginTop: 14 }}>
          <div className="banner banner-green" style={{ margin: '6px 0 18px' }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <div>
              <h3 style={{ fontSize: 15 }}>Why verification matters</h3>
              <p style={{ fontSize: 12.5 }}>GrowthProof is only as strong as its proof. Documents are reviewed by admins and never appear on your profile.</p>
            </div>
          </div>
          <Field label="Matriculation number"><Input placeholder="e.g. 220403012" inputMode="numeric" value={matric} onChange={(e) => setMatric(e.target.value)} /></Field>
          <Field label="Upload student ID"><UploadBox label="Upload student ID" fileName={idDoc} onChange={setIdDoc} /></Field>
          <Field label="Upload selfie"><UploadBox label="Upload selfie" fileName={selfie} onChange={setSelfie} /></Field>
          <p className="subtle" style={{ fontSize: 12.5, margin: '4px 0 16px' }}>
            Status: <strong>Pending</strong> while admins review. You can keep browsing and pick your skills meanwhile.
          </p>
          <button className="btn btn-primary btn-lg btn-block" onClick={verify}>Submit for verification</button>
        </div>
      )}

      {/* 5 — SKILLS */}
      {step === 'skills' && (
        <div style={{ marginTop: 14 }}>
          <p className="subtle" style={{ marginBottom: 12 }}>Pick up to five skills. Campaigns that match them show up first on your Home screen.</p>
          <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
            {SKILLS.map((s) => (
              <button key={s} className={`chip ${skills.includes(s) ? 'active' : ''}`} onClick={() => toggleSkill(s)}>{s}</button>
            ))}
          </div>
          <p className="subtle" style={{ fontSize: 12.5 }}>Selected {skills.length}/5</p>
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 16 }} onClick={saveSkills}>
            <IconCheck size={18} /> Start building proof
          </button>
        </div>
      )}
    </div>
  );
}