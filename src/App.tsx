import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toasts } from './components/ui';
import Splash from './screens/Splash';
import Onboarding from './screens/Onboarding';
import Login from './screens/Login';
import AppShell from './screens/AppShell';
import Home from './screens/Home';
import Campaigns from './screens/Campaigns';
import CampaignDetail from './screens/CampaignDetail';
import CreateCampaign from './screens/CreateCampaign';
import Workspace from './screens/Workspace';
import Passport from './screens/Passport';
import Verify from './screens/Verify';
import Squads from './screens/Squads';
import SquadDetail from './screens/SquadDetail';
import Inbox from './screens/Inbox';
import Chat from './screens/Chat';
import Notifications from './screens/Notifications';
import EditProfile from './screens/EditProfile';
import Help from './screens/Help';
import AdminDashboard from './screens/AdminDashboard';
import AmbassadorDashboard from './screens/AmbassadorDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Toasts />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaign/:id" element={<CampaignDetail />} />
          <Route path="create" element={<CreateCampaign />} />
          <Route path="workspace/:id" element={<Workspace />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="chat/:id" element={<Chat />} />
          <Route path="passport" element={<Passport />} />
          <Route path="user/:id" element={<Passport />} />
          <Route path="squads" element={<Squads />} />
          <Route path="squad/:id" element={<SquadDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile/edit" element={<EditProfile />} />
          <Route path="verify" element={<Verify />} />
          <Route path="help" element={<Help />} />
        </Route>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/ambassador" element={<AmbassadorDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}