import { useState } from 'react';
import { Button, Checkbox, Drawer, Form, Input, InputNumber, Modal, Pagination, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { allPermissions, permissionOptions, Permission } from '../../auth/permissions';
import {
  Employee,
  EmployeePayload,
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useGetTeachersQuery,
  useUpdateEmployeeMutation,
} from '../../services/api';

type EmployeeFormValues = EmployeePayload;

const defaultValues: EmployeeFormValues = {
  fullName: '',
  username: '',
  password: '',
  role: 'employee',
  teacherId: null,
  permissions: [],
  monthlySalary: 0,
  status: 'active',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    return (error as { data?: { message?: string } }).data?.message || fallback;
  }

  return fallback;
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const [form] = Form.useForm<EmployeeFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [permissionsEmployee, setPermissionsEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const role = Form.useWatch('role', form);
  const { data, isFetching } = useGetEmployeesQuery({
    search: search.trim() || undefined,
    page,
    limit,
  });
  const { data: teachersResponse } = useGetTeachersQuery({ limit: 100 });
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();

  function openCreateDrawer() {
    setEditingEmployee(null);
    form.resetFields();
    form.setFieldsValue(defaultValues);
    setDrawerOpen(true);
  }

  function openEditDrawer(employee: Employee) {
    setEditingEmployee(employee);
    form.setFieldsValue({
      fullName: employee.fullName,
      username: employee.username,
      password: '',
      role: employee.role,
      teacherId: employee.teacherId,
      permissions: employee.permissions,
      monthlySalary: employee.monthlySalary || 0,
      status: employee.status,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingEmployee(null);
    form.resetFields();
  }

  async function handleSubmit(values: EmployeeFormValues) {
    const payload = {
      ...values,
      username: values.username.trim().toLowerCase(),
      permissions: values.role === 'owner' ? allPermissions : values.permissions,
      teacherId: values.role === 'teacher' ? values.teacherId : null,
      password: values.password || undefined,
    };

    try {
      if (editingEmployee) {
        await updateEmployee({ id: editingEmployee.id, body: payload }).unwrap();
        message.success('Hodim yangilandi');
      } else {
        await createEmployee(payload).unwrap();
        message.success('Hodim qo‘shildi');
      }

      closeDrawer();
    } catch (error) {
      message.error(getErrorMessage(error, 'Hodimni saqlab bo‘lmadi'));
    }
  }

  function confirmDelete(employee: Employee) {
    Modal.confirm({
      title: 'Hodimni o‘chirish',
      content: `${employee.fullName} hisobi o‘chiriladi. Davom etasizmi?`,
      okText: 'O‘chirish',
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isDeleting },
      async onOk() {
        try {
          await deleteEmployee(employee.id).unwrap();
          message.success('Hodim o‘chirildi');
        } catch (error) {
          message.error(getErrorMessage(error, 'Hodimni o‘chirib bo‘lmadi'));
        }
      },
    });
  }

  return (
    <section className="page employees-page">
      <div className="page-header">
        <div className="employee-header-main">
          <Input
            allowClear
            prefix={<Search size={16} />}
            placeholder="F.I.Sh, login yoki rol bo‘yicha qidirish"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button type="primary" icon={<Plus size={17} />} onClick={openCreateDrawer}>Hodim qo‘shish</Button>
      </div>

      <Table
        className="employees-table"
        rowKey="id"
        loading={isFetching}
        dataSource={data?.data || []}
        pagination={{
          current: data?.pagination.page || page,
          pageSize: data?.pagination.limit || limit,
          total: data?.pagination.total || 0,
          showSizeChanger: true,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
        scroll={{ x: 900 }}
        columns={[
          { title: 'F.I.Sh', dataIndex: 'fullName' },
          { title: 'Login', dataIndex: 'username' },
          { title: 'Oylik maosh', dataIndex: 'monthlySalary', render: (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so'm` },
          {
            title: 'Rol',
            dataIndex: 'role',
            render: (value) => {
              const labels = { owner: 'Owner', employee: 'Hodim', teacher: "O'qituvchi" } as const;
              return <Tag color={value === 'owner' ? 'magenta' : value === 'teacher' ? 'cyan' : 'blue'}>{labels[value as keyof typeof labels]}</Tag>;
            },
          },
          {
            title: 'Ruxsatlar',
            dataIndex: 'permissions',
            width: 190,
            render: (_permissions: Permission[], record: Employee) => (
              <Button icon={<Eye size={16} />} onClick={() => setPermissionsEmployee(record)}>
                Ruxsatlarni ko‘rish
              </Button>
            ),
          },
          {
            title: 'Holat',
            dataIndex: 'status',
            render: (value) => <Tag color={value === 'active' ? 'green' : 'red'}>{value === 'active' ? 'Faol' : 'Nofaol'}</Tag>,
          },
          {
            title: 'Amallar',
            width: 120,
            render: (_value, record) => (
              <Space>
                <Tooltip title="Tahrirlash">
                  <Button size="small" className="action-edit-button" icon={<Edit3 size={16} />} onClick={() => openEditDrawer(record)} />
                </Tooltip>
                <Tooltip title="O‘chirish">
                  <Button size="small" danger icon={<Trash2 size={16} />} onClick={() => confirmDelete(record)} />
                </Tooltip>
              </Space>
            ),
          },
        ]}
      />

      <div className="employees-mobile-list">
        {(data?.data || []).map((employee) => {
          const roleLabels = { owner: 'Owner', employee: 'Hodim', teacher: "O'qituvchi" } as const;
          const roleColor = employee.role === 'owner' ? 'magenta' : employee.role === 'teacher' ? 'cyan' : 'blue';

          return (
            <article className="employee-mobile-card" key={employee.id}>
              <div className="employee-mobile-heading">
                <div>
                  <strong>{employee.fullName}</strong>
                  <span>@{employee.username}</span>
                </div>
                <Tag color={roleColor}>{roleLabels[employee.role]}</Tag>
              </div>
              <div className="employee-mobile-details">
                <span>Oylik maosh</span>
                <strong>{Number(employee.monthlySalary || 0).toLocaleString('uz-UZ')} so'm</strong>
                <span>Holat</span>
                <Tag color={employee.status === 'active' ? 'green' : 'red'}>{employee.status === 'active' ? 'Faol' : 'Nofaol'}</Tag>
              </div>
              <div className="employee-mobile-actions">
                <Tooltip title="Ruxsatlarni ko'rish">
                  <Button size="small" aria-label="Ruxsatlarni ko'rish" icon={<Eye size={16} />} onClick={() => setPermissionsEmployee(employee)} />
                </Tooltip>
                <Tooltip title="Tahrirlash">
                  <Button className="employee-mobile-edit-button" size="small" aria-label="Tahrirlash" icon={<Edit3 size={16} />} onClick={() => openEditDrawer(employee)} />
                </Tooltip>
                <Tooltip title="O‘chirish">
                  <Button size="small" danger aria-label="O‘chirish" icon={<Trash2 size={16} />} onClick={() => confirmDelete(employee)} />
                </Tooltip>
              </div>
            </article>
          );
        })}
        {!isFetching && !(data?.data || []).length ? <div className="employees-mobile-empty">Hodimlar topilmadi</div> : null}
        {(data?.pagination.total || 0) > 0 ? (
          <Pagination
            className="employees-mobile-pagination"
            current={data?.pagination.page || page}
            pageSize={data?.pagination.limit || limit}
            total={data?.pagination.total || 0}
            showSizeChanger
            onChange={(nextPage, nextLimit) => {
              setPage(nextPage);
              setLimit(nextLimit);
            }}
          />
        ) : null}
      </div>

      <Modal
        title={`${permissionsEmployee?.fullName || ''} ruxsatlari`}
        open={Boolean(permissionsEmployee)}
        onCancel={() => setPermissionsEmployee(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPermissionsEmployee(null)}>
            Yopish
          </Button>,
        ]}
      >
        <div className="permissions-modal-list">
          {(permissionsEmployee?.role === 'owner' ? allPermissions : permissionsEmployee?.permissions || []).map((permission) => (
            <div className="permissions-modal-item" key={permission}>
              <span>{permissionOptions.find((item) => item.value === permission)?.label}</span>
              <Tag color="green">Ruxsat berilgan</Tag>
            </div>
          ))}
        </div>
      </Modal>

      <Drawer
        title={editingEmployee ? 'Hodimni tahrirlash' : 'Hodim qo‘shish'}
        width="min(620px, 100vw)"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={defaultValues} onFinish={handleSubmit}>
          <Form.Item name="fullName" label="F.I.Sh" rules={[{ required: true, min: 3, message: 'F.I.Sh kiriting' }]}>
            <Input placeholder="Hodim F.I.Sh" />
          </Form.Item>
          <Form.Item
            name="username"
            label="Login"
            normalize={(value) => value?.toLowerCase().trim()}
            rules={[
              { required: true, message: 'Login kiriting' },
              { pattern: /^[a-z0-9._-]{3,60}$/, message: 'Login formati noto‘g‘ri' },
            ]}
          >
            <Input autoComplete="off" placeholder="Masalan: sardor" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingEmployee ? 'Yangi parol' : 'Parol'}
            extra={editingEmployee ? 'O‘zgartirmaslik uchun bo‘sh qoldiring.' : undefined}
            rules={editingEmployee ? [{ min: 6, message: 'Kamida 6 ta belgi' }] : [{ required: true, min: 6, message: 'Kamida 6 ta belgi' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <div className="form-grid">
            <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Hodim', value: 'employee' },
                  { label: "O'qituvchi", value: 'teacher' },
                  ...(user?.role === 'owner' ? [{ label: 'Owner', value: 'owner' as const }] : []),
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="Holat" rules={[{ required: true }]}>
              <Select options={[{ label: 'Faol', value: 'active' }, { label: 'Nofaol', value: 'inactive' }]} />
            </Form.Item>
          </div>
          {role === 'teacher' ? (
            <Form.Item
              name="teacherId"
              label="O'qituvchi profili"
              rules={[{ required: true, message: "O'qituvchi profilini tanlang" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={(teachersResponse?.data || []).map((teacher) => ({
                  label: `${teacher.fullName} (${teacher.subject})`,
                  value: teacher.id,
                }))}
              />
            </Form.Item>
          ) : (
            <Form.Item name="monthlySalary" label="Oylik maosh">
              <InputNumber min={0} className="full-width" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
            </Form.Item>
          )}
          <Form.Item
            name="permissions"
            label="Bo‘limlarga ruxsat"
            rules={[{
              validator: (_rule, value) => role === 'owner' || value?.length
                ? Promise.resolve()
                : Promise.reject(new Error('Kamida bitta bo‘limni tanlang')),
            }]}
          >
            <Checkbox.Group className="permission-grid" options={permissionOptions} disabled={role === 'owner'} />
          </Form.Item>
          <div className="drawer-form-actions">
            <Button onClick={closeDrawer}>Bekor qilish</Button>
            <Button type="primary" htmlType="submit" loading={isCreating || isUpdating}>Saqlash</Button>
          </div>
        </Form>
      </Drawer>
    </section>
  );
}
