import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, landingPath } from '../lib/store';
import { Field, Input, LogoMark, toast } from '../components/ui';
import { IconBack, IconShield, IconCrown, IconTarget, IconUser, IconPassport } from '../components/icons';

const DEMO_ACCOUNTS = [
  { username: 'salawu', label: 'Promoter & creator', desc: 'Salawu — joins Campaigns, submits proof, earns GrowthProof', icon: <IconPassport size={16} />, bg: 'linear-gradient(135deg,#0b8c66,#065f46)' },
  { username: 'funmilayo', label: 'Student vendor', desc: 'Funmilayo — post Campaigns & confirm results', icon: <IconTarget size={16} />, bg: 'linear-gradient(135deg,#1d4ed8,#3730a3)' },
  { username: 'tobi', label: 'New student', desc: 'Tobi — finishes verification first', icon: <IconUser size={16} />, bg: 'linear-gradient(135deg,#0284c7,#075985)' },
  { username: 'chuka', label: 'Campus ambassador', desc: 'Chuka — ambassador HQ: recruit, help, earn rewards', icon: <IconShield size={16} />, bg: 'linear-gradient(135deg,#7c3aed,#5b21b6)' },
  { username: 'admin', label: 'Campus admin', desc: 'Kunle — moderation, verifications & approvals', icon: <IconCrown size={16} />, bg: 'linear-gradient(135deg,#ea580c,#c2410c)' },
];

export default function Login() {
  const { actions } = useApp();
  const nav = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = async (identifier?: string, password?: string) => {
    const e = await actions.login(identifier ?? id, password ?? pw);
    if (e) { setErr(e); return; }
    toast('Welcome back 👋', 'success');
    nav(landingPath(currentUser()));
  };

  return (
    <div className="onboard">
      <button className="btn-icon btn-soft" style={{ marginBottom: 14 }} onClick={() => nav('/')}>
        <IconBack size={18} />
      </button>
      <div className="row" style={{ marginBottom: 20 }}>
        <LogoMark size={36} />
        <div>
          <div className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>Welcome back</div>
          <div className="subtle">Build proof. Earn trust. Get hired.</div>
        </div>
      </div>

      <Field label="Username, email or phone">
        <Input placeholder="salawu or you@student.unilag.edu.ng" value={id} onChange={(e) => setId(e.target.value)} autoCapitalize="none" autoCorrect="off" />
      </Field>
      <Field label="Password">
        <Input type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>

      {err && <div className="safety-tip" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)', marginBottom: 12 }}>
        <span>⚠️</span><span>{err}</span>
      </div>}

      <button className="btn btn-primary btn-lg btn-block" onClick={() => submit()}>Log in</button>
      <button className="btn btn-block btn-soft" style={{ marginTop: 10 }} onClick={() => nav('/onboarding')}>
        New here? Create your account
      </button>

      <div className="divider" />
      <div className="col" style={{ gap: 10 }}>
        <p className="strong" style={{ fontSize: 13, color: 'var(--navy)' }}>Demo accounts — tap to explore each role</p>
        {DEMO_ACCOUNTS.map((d) => (
          <div key={d.username} className="demo-login" onClick={() => submit(d.username, 'password123')}>
            <div className="row" style={{ gap: 11 }}>
              <span className="demo-icon" style={{ background: d.bg }}>{d.icon}</span>
              <div>
                <div className="demo-role">{d.label}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{d.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}