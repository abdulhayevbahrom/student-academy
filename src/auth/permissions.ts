export type Permission =
  | 'dashboard'
  | 'teachers'
  | 'groups'
  | 'archived_groups'
  | 'students'
  | 'reception'
  | 'payments'
  | 'expenses'
  | 'employees';

export type NavigationIconKey =
  | 'dashboard'
  | 'teachers'
  | 'groups'
  | 'schedule'
  | 'archivedGroups'
  | 'leads'
  | 'students'
  | 'attendance'
  | 'reception'
  | 'payments'
  | 'reports'
  | 'expenses'
  | 'salaries'
  | 'employees'
  | 'settings'
  | 'studentPoints';

export type NavigationItem = {
  key: string;
  label: string;
  permission?: Permission;
  ownerOnly?: boolean;
  teacherOnly?: boolean;
  iconKey: NavigationIconKey;
};

export const navigationItems: NavigationItem[] = [
  { key: '/dashboard', iconKey: 'dashboard', label: 'Dashboard', permission: 'dashboard' },
  { key: '/teachers', iconKey: 'teachers', label: "O'qituvchilar", permission: 'teachers' },
  { key: '/groups', iconKey: 'groups', label: 'Guruhlar', permission: 'groups' },
  { key: '/schedule', iconKey: 'schedule', label: 'Dars jadvali', permission: 'groups' },
  { key: '/archived-groups', iconKey: 'archivedGroups', label: 'Arxiv guruhlar', permission: 'archived_groups' },
  { key: '/leads', iconKey: 'leads', label: 'Leadlar', permission: 'reception' },
  { key: '/students', iconKey: 'students', label: "O'quvchilar", permission: 'students' },
  { key: '/attendance', iconKey: 'attendance', label: 'Davomat', permission: 'students' },
  { key: '/student-points', iconKey: 'studentPoints', label: 'Plus / Minus', teacherOnly: true },
  { key: '/reception', iconKey: 'reception', label: 'Reception', permission: 'reception' },
  { key: '/payments', iconKey: 'payments', label: "To'lovlar", permission: 'payments' },
  { key: '/reports', iconKey: 'reports', label: 'Hisobot', permission: 'dashboard' },
  { key: '/expenses', iconKey: 'expenses', label: 'Xarajatlar', permission: 'expenses' },
  { key: '/salaries', iconKey: 'salaries', label: 'Oyliklar', ownerOnly: true },
  { key: '/employees', iconKey: 'employees', label: 'Hodimlar', ownerOnly: true },
  { key: '/settings', iconKey: 'settings', label: 'Sozlamalar', ownerOnly: true },
];

export const permissionOptions: { label: string; value: Permission }[] = Array.from(
  navigationItems.reduce((map, item) => {
    if (!item.permission) return map;

    const labels = map.get(item.permission) || [];
    labels.push(item.label);
    map.set(item.permission, labels);
    return map;
  }, new Map<Permission, string[]>()),
).map(([value, labels]) => ({ value, label: labels.join(', ') }));

export const allPermissions = permissionOptions.map((permission) => permission.value);
