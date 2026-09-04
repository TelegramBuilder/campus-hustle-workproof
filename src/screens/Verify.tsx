import { useState } from 'react';
import { useApp, currentUser } from '../lib/store';
import { Field, Input, UploadBox, toast } from '../components/ui';

export default function Verify() {
  const { state, actions } = useApp();
  const me = currentUser();
  const record = state.verifications.find((v) => v.userId === me?.id);
  const [matric, setMatric] = useState(me?.matricNo ?? '');
  const [idDoc, setIdDoc] = useState('');
  const [selfie, setSelfie] = useState('');
  const [fileMeta, setFileMeta] = useState<{ id?: { name: string; size?: number; type?: string }; selfie?: { name: string; size?: number; type?: string } }>({});

  if (!me) return null;

  const status = me.verificationStatus;

  const submit = () => {
    if (!/^\d{6,10}$/.test(matric.replace(/\s/g, ''))) { toast('Enter your matric / admission number', 'error'); return; }
    if (!idDoc || !selfie) { toast('Attach your student ID and selfie', 'error'); return; }
    const err = actions.submitVerification({ matricNo: matric.trim(), idDocumentName: idDoc, selfieName: selfie });
    if (err) { toast(err, 'error'); return; }
    toast('Documents submitted for review — usually under 24 hours', 'success');
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="screen-header">
        <h1>Student verification</h1>
        <span />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div className={`banner ${status === 'verified' ? 'banner-green' : status === 'rejected' ? 'banner-red' : 'banner-amber'}`}>
          <span style={{ fontSize: 22 }}>{status === 'verified' ? '✅' : status === 'rejected' ? '⚠️' : '🛡️'}</span>
          <div>
            <h3 style={{ fontSize: 15 }}>{status === 'verified' ? 'You’re verified' : status === 'rejected' ? 'Verification rejected' : status === 'suspended' ? 'Account suspended' : 'Verification pending'}</h3>
            <p style={{ fontSize: 12.5 }}>
              {status === 'verified' && 'Your UNILAG identity was confirmed. Verified badge is live on your profile.'}
              {status === 'pending' && (record?.note ? `Admin note: ${record.note}` : 'Your documents are with the admins — usually decided within 24 hours.')}
              {status === 'rejected' && (record?.note ?? 'Re-submit with clearer photos and a readable ID.')}
              {status === 'suspended' && 'Your account is suspended. Contact campus admin to appeal.'}
            </p>
          </div>
        </div>

        {(status === 'rejected' || status === 'unverified') && (
          <>
            <p className="subtle" style={{ fontSize: 13, margin: '14px 0 4px' }}>
              Re-submission attempt {(record?.attempt ?? 0) + 1} — documents are reviewed by admins and never shown publicly.
            </p>
            <Field label="Matriculation number">
              <Input placeholder="e.g. 220403012" inputMode="numeric" value={matric} onChange={(e) => setMatric(e.target.value)} />
            </Field>
            <Field label="Upload student ID">
              <UploadBox label="Upload student ID" fileName={idDoc || record?.idDocumentName} meta={fileMeta.id?.name ? `${(fileMeta.id.size ?? 0) > 0 ? `${Math.round((fileMeta.id.size ?? 0) / 1024)} KB` : ''}` : undefined} accept="image/*,.pdf" onChange={(name, m) => { setIdDoc(name); if (m) setFileMeta((p) => ({ ...p, id: m })); }} />
            </Field>
            <Field label="Upload selfie (hold your ID, face visible)">
              <UploadBox label="Upload selfie" fileName={selfie || record?.selfieName} accept="image/*" onChange={(name, m) => { setSelfie(name); if (m) setFileMeta((p) => ({ ...p, selfie: m })); }} />
            </Field>
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={submit}>Submit for verification</button>
          </>
        )}

        {status === 'pending' && (
          <p className="subtle" style={{ fontSize: 12.5, marginTop: 14 }}>
            Attempts logged: {record?.attempt ?? 1}. You can browse Campaigns while pending, but posting requires verification.
          </p>
        )}
        {status === 'verified' && (
          <p className="subtle" style={{ fontSize: 12.5, marginTop: 14 }}>
            Verification badge, rating and completed Campaigns now build your GrowthProof Passport.
          </p>
        )}
      </div>
    </div>
  );
}
