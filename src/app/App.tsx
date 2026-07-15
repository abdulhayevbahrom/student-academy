import {
  Archive,
  Bell,
  BookOpen,
  ChartBar,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Phone,
  ReceiptText,
  CircleDollarSign,
  CalendarDays,
  UserCog,
  UserPlus,
  CirclePlus,
  UsersRound,
  Wallet,
  X,
  Menu as MenuIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Badge, Button, Dropdown, Drawer, Layout, Menu, Modal, Spin, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { navigationItems, NavigationIconKey, Permission } from '../auth/permissions';
import { SOCKET_URL } from '../config/env';
import { SUPPORT_CONTACT, UNIFY_BRAND } from '../config/branding';
import BrandIdentity from '../components/BrandIdentity';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import EmployeesPage from '../pages/employees/EmployeesPage';
import ExpensesPage from '../pages/expenses/ExpensesPage';
import GroupsPage from '../pages/groups/GroupsPage';
import LeadsPage from '../pages/leads/LeadsPage';
import PaymentsPage from '../pages/payments/PaymentsPage';
import ReceptionPage from '../pages/reception/ReceptionPage';
import ReportsPage from '../pages/reports/ReportsPage';
import SalariesPage from '../pages/salaries/SalariesPage';
import SchedulePage from '../pages/schedule/SchedulePage';
import StudentsPage from '../pages/students/StudentsPage';
import AttendancePage from '../pages/attendance/AttendancePage';
import TeachersPage from '../pages/teachers/TeachersPage';
import SettingsPage from '../pages/settings/SettingsPage';
import StudentPointsPage from '../pages/student-points/StudentPointsPage';
import {
  AppNotification,
  api,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetBrandingSettingsQuery,
} from '../services/api';

const { Header, Sider, Content } = Layout;

const navigationIcons: Record<NavigationIconKey, ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  teachers: <GraduationCap size={18} />,
  groups: <BookOpen size={18} />,
  schedule: <CalendarDays size={18} />,
  archivedGroups: <Archive size={18} />,
  leads: <UserPlus size={18} />,
  students: <UsersRound size={18} />,
  attendance: <ClipboardCheck size={18} />,
  studentPoints: <CirclePlus size={18} />,
  reception: <UserPlus size={18} />,
  payments: <Wallet size={18} />,
  reports: <ChartBar size={18} />,
  expenses: <ReceiptText size={18} />,
  salaries: <CircleDollarSign size={18} />,
  employees: <UserCog size={18} />,
  settings: <SettingsIcon size={18} />,
};

const pageTitles = Object.fromEntries(navigationItems.map((item) => [item.key, item.label]));

function getTelegramUrl(value: string) {
  const username = value.replace(/^@/, '').trim();

  if (!username) return undefined;
  if (username.startsWith('http://') || username.startsWith('https://')) return username;

  return `https://t.me/${username}`;
}

function PermissionRoute({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { hasPermission } = useAuth();

  return hasPermission(permission) ? children : <Navigate to="/" replace />;
}

function NotificationBell() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { data } = useGetNotificationsQuery(undefined, { skip: !user });
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const notifications = data?.data || [];

  useEffect(() => {
    const token = localStorage.getItem('sab_auth_token');

    if (!token || !user) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('notification:new', (payload: { notification?: AppNotification }) => {
      message.info(payload.notification?.message || 'Yangi bildirishnoma');
      dispatch(api.util.invalidateTags([{ type: 'Notification', id: 'LIST' }, { type: 'PaymentsDashboard', id: 'CURRENT' }]));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, user]);

  const overlay = (
    <div className="notification-dropdown">
      <div className="notification-dropdown-header">
        <strong>Bildirishnomalar</strong>
        <span>{notifications.length}</span>
      </div>
      {notifications.length ? (
        notifications.map((notification) => (
          <div
            role="button"
            tabIndex={0}
            className="notification-item"
            key={notification.id}
            onClick={() => markNotificationRead(notification.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                markNotificationRead(notification.id);
              }
            }}
          >
            <span>{notification.title}</span>
            <small>{notification.message}</small>
            <time>{dayjs(notification.createdAt).format('DD.MM.YYYY HH:mm')}</time>
          </div>
        ))
      ) : (
        <div className="notification-empty">Yangi bildirishnoma yo‘q</div>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => overlay}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName="notification-dropdown-popup"
    >
      <Badge count={notifications.length} size="small">
        <Button className="header-icon-button" type="text" icon={<Bell size={19} />} />
      </Badge>
    </Dropdown>
  );
}

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { data: branding } = useGetBrandingSettingsQuery();
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const allowedItems = navigationItems.filter((item) => (
    item.ownerOnly
      ? user?.role === 'owner'
      : item.teacherOnly
        ? user?.role === 'teacher' || user?.role === 'owner'
        : Boolean(item.permission && hasPermission(item.permission))
  ));
  const defaultPath = allowedItems[0]?.key || '/login';
  const pageTitle = pageTitles[location.pathname] || "O'quv markaz boshqaruvi";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  function handleNavigate(path: string) {
    navigate(path);
    setMobileNavOpen(false);
  }

  const sidebarMenu = (
    <>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={(item) => handleNavigate(item.key)}
        items={allowedItems.map(({ key, label, iconKey }) => ({ key, label, icon: navigationIcons[iconKey] }))}
      />
      <button className="sidebar-support" type="button" onClick={() => setSupportOpen(true)}>
        <span>Support bilan bog'lanish</span>
      </button>
    </>
  );

  const mobileSidebarHeader = (
    <div className="mobile-sidebar-header">
      <BrandIdentity brand={branding?.unify || UNIFY_BRAND} />
      <Button
        className="mobile-sidebar-close"
        type="text"
        icon={<X size={20} />}
        aria-label="Yopish"
        onClick={() => setMobileNavOpen(false)}
      />
    </div>
  );

  return (
      <Layout className="app-shell">
      <Sider breakpoint="xl" collapsedWidth={0} width="clamp(220px, 13vw, 288px)" className="app-sidebar">
        <div className="brand">
          <BrandIdentity brand={branding?.unify || UNIFY_BRAND} />
        </div>
        {sidebarMenu}
      </Sider>
      <Drawer
        title={null}
        closable={false}
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        width="min(320px, calc(100vw - 16px))"
        className="mobile-sidebar-drawer"
        destroyOnClose
      >
        <div className="mobile-sidebar-shell">
          {mobileSidebarHeader}
          {sidebarMenu}
        </div>
      </Drawer>
      <Modal
        title="Support bilan bog'lanish"
        open={supportOpen}
        onCancel={() => setSupportOpen(false)}
        footer={null}
        width="min(420px, calc(100vw - 24px))"
      >
        <div className="support-modal-content">
          <a href={SUPPORT_CONTACT.phone ? `tel:${SUPPORT_CONTACT.phone.replace(/\s/g, '')}` : undefined}>
            <Phone size={18} />
            <span>Telefon</span>
            <strong>{SUPPORT_CONTACT.phone || 'Telefon kiritilmagan'}</strong>
          </a>
          <a href={getTelegramUrl(SUPPORT_CONTACT.telegram)} target="_blank" rel="noreferrer">
            <MessageCircle size={18} />
            <span>Telegram</span>
            <strong>{SUPPORT_CONTACT.telegram || 'Telegram kiritilmagan'}</strong>
          </a>
        </div>
      </Modal>
      <Layout>
        <Header className="app-header">
          <div className="header-title-group">
            <Button
              className="mobile-sidebar-button"
              type="text"
              icon={<MenuIcon size={20} />}
              aria-label="Menyu"
              onClick={() => setMobileNavOpen(true)}
            />
            <Typography.Title level={4}>{pageTitle}</Typography.Title>
          </div>
          <div className="header-actions">
            <Tooltip title="Bildirishnomalar">
              <NotificationBell />
            </Tooltip>
            <Typography.Text className="header-user">{user?.fullName}</Typography.Text>
            <Tooltip title="Chiqish">
              <Button className="header-icon-button" type="text" icon={<LogOut size={19} />} onClick={handleLogout} />
            </Tooltip>
          </div>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/dashboard" element={<PermissionRoute permission="dashboard"><DashboardPage /></PermissionRoute>} />
            <Route path="/teachers" element={<PermissionRoute permission="teachers"><TeachersPage /></PermissionRoute>} />
            <Route path="/groups" element={<PermissionRoute permission="groups"><GroupsPage /></PermissionRoute>} />
            <Route path="/schedule" element={<PermissionRoute permission="groups"><SchedulePage /></PermissionRoute>} />
            <Route path="/archived-groups" element={<PermissionRoute permission="archived_groups"><GroupsPage archivedOnly /></PermissionRoute>} />
            <Route path="/leads" element={<PermissionRoute permission="reception"><LeadsPage /></PermissionRoute>} />
            <Route path="/students" element={<PermissionRoute permission="students"><StudentsPage /></PermissionRoute>} />
            <Route path="/attendance" element={<PermissionRoute permission="students"><AttendancePage /></PermissionRoute>} />
            <Route path="/student-points" element={user?.role === 'teacher' || user?.role === 'owner' ? <StudentPointsPage /> : <Navigate to={defaultPath} replace />} />
            <Route path="/reception" element={<PermissionRoute permission="reception"><ReceptionPage /></PermissionRoute>} />
            <Route path="/payments" element={<PermissionRoute permission="payments"><PaymentsPage /></PermissionRoute>} />
            <Route path="/reports" element={<PermissionRoute permission="dashboard"><ReportsPage /></PermissionRoute>} />
            <Route path="/expenses" element={<PermissionRoute permission="expenses"><ExpensesPage /></PermissionRoute>} />
            <Route path="/salaries" element={user?.role === 'owner' ? <SalariesPage /> : <Navigate to={defaultPath} replace />} />
            <Route path="/employees" element={user?.role === 'owner' ? <EmployeesPage /> : <Navigate to={defaultPath} replace />} />
            <Route path="/settings" element={user?.role === 'owner' ? <SettingsPage /> : <Navigate to={defaultPath} replace />} />
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading"><Spin size="large" /></div>;
  }

  return user ? <Shell /> : <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}
