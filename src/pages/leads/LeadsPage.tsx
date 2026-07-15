import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Dropdown,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Edit3, EllipsisVertical, GraduationCap, History, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import {
  ConvertLeadPayload,
  Group,
  Lead,
  LeadFilters,
  LeadPayload,
  LeadStatus,
  StudentEnrollment,
  useConvertLeadMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useGetGroupsQuery,
  useGetLeadsQuery,
  useGetSubjectsQuery,
  useUpdateLeadMutation,
} from '../../services/api';
import { formatUzPhone, formatUzPhoneDisplay } from '../../utils/phone';

const { TextArea } = Input;

const fallbackSubjectOptions = [
  { label: 'Buxgalteriya', value: 'Buxgalteriya' },
  { label: 'IT', value: 'IT' },
  { label: 'Ingliz tili', value: 'Ingliz tili' },
  { label: 'Matematika', value: 'Matematika' },
  { label: 'Boshqa', value: 'Boshqa' },
];

const sourceOptions = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Telegram', value: 'Telegram' },
  { label: 'Tavsiya', value: 'Tavsiya' },
  { label: 'Tashqi reklama', value: 'Tashqi reklama' },
  { label: 'Telefon', value: 'Telefon' },
  { label: 'Boshqa', value: 'Boshqa' },
];

const statusOptions: { label: string; value: LeadStatus }[] = [
  { label: 'Yangi', value: 'new' },
  { label: 'Aloqa qilindi', value: 'contacted' },
  { label: 'Qiziqish bor', value: 'interested' },
  { label: 'Sinov darsiga yozildi', value: 'trial_scheduled' },
  { label: 'Sinov darsiga keldi', value: 'trial_attended' },
  { label: 'Ro‘yxatdan o‘tishga tayyor', value: 'ready_to_enroll' },
  { label: 'Studentga aylantirildi', value: 'converted' },
  { label: 'Yo‘qotilgan', value: 'lost' },
];

const statusMeta: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Yangi', color: 'blue' },
  contacted: { label: 'Aloqa qilindi', color: 'cyan' },
  interested: { label: 'Qiziqish bor', color: 'geekblue' },
  trial_scheduled: { label: 'Sinov darsi', color: 'purple' },
  trial_attended: { label: 'Sinovga keldi', color: 'gold' },
  ready_to_enroll: { label: 'Tayyor', color: 'lime' },
  converted: { label: 'Student', color: 'green' },
  lost: { label: 'Yo‘qotilgan', color: 'red' },
};

type LeadFormValues = Omit<LeadPayload, 'trialDate' | 'nextContactAt'> & {
  trialDate?: Dayjs | null;
  nextContactAt?: Dayjs | null;
};

type ConvertFormValues = ConvertLeadPayload;

const defaultLeadValues: LeadFormValues = {
  fullName: '',
  phone: '',
  secondaryPhone: '',
  parentName: '',
  parentPhone: '',
  subject: 'IT',
  source: '',
  status: 'new',
  preferredGroupId: null,
  trialGroupId: null,
  trialDate: null,
  nextContactAt: null,
  lostReason: '',
  note: '',
  activityNote: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '-';
}

function formatGroupOption(group: Group) {
  return `${group.name} • ${group.subject} • ${group.startTime}-${group.endTime}`;
}

function toLeadPayload(values: LeadFormValues): LeadPayload {
  return {
    ...values,
    trialDate: values.trialDate ? values.trialDate.toISOString() : null,
    nextContactAt: values.nextContactAt ? values.nextContactAt.toISOString() : null,
    preferredGroupId: values.preferredGroupId || null,
    trialGroupId: values.trialGroupId || null,
  };
}

export default function LeadsPage() {
  const [form] = Form.useForm<LeadFormValues>();
  const [convertForm] = Form.useForm<ConvertFormValues>();
  const [filters, setFilters] = useState<LeadFilters>({ view: 'active' });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [convertLeadRecord, setConvertLeadRecord] = useState<Lead | null>(null);
  const selectedSubject = Form.useWatch('subject', form);

  const queryFilters = useMemo(
    () => ({ ...filters, search: filters.search?.trim() || undefined, page, limit }),
    [filters, limit, page],
  );
  const { data: leadsResponse, isFetching, isError } = useGetLeadsQuery(queryFilters);
  const { data: groupsResponse, isFetching: isGroupsFetching } = useGetGroupsQuery({ status: 'active', limit: 100, accessScope: 'reception' });
  const { data: subjectsResponse } = useGetSubjectsQuery();
  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [deleteLead, { isLoading: isDeleting }] = useDeleteLeadMutation();
  const [convertLead, { isLoading: isConverting }] = useConvertLeadMutation();

  const leads = leadsResponse?.data || [];
  const pagination = leadsResponse?.pagination;
  const groups = groupsResponse?.data || [];
  const subjectOptions = (subjectsResponse?.data.length ? subjectsResponse.data : fallbackSubjectOptions.map((subject) => subject.value))
    .map((subject) => ({ label: subject, value: subject }));
  const groupOptions = groups
    .filter((group) => !selectedSubject || group.subject === selectedSubject)
    .map((group) => ({ label: formatGroupOption(group), value: group.id }));
  const allGroupOptions = groups.map((group) => ({ label: formatGroupOption(group), value: group.id }));
  const isSaving = isCreating || isUpdating;
  const compactDesktop = viewportWidth <= 1251;
  const mobileView = viewportWidth < 768;
  const actionMenuCompact = viewportWidth <= 1251;
  const tableScroll = viewportWidth > 1251 ? { x: 1120 } : undefined;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function openCreateDrawer() {
    setEditingLead(null);
    form.setFieldsValue(defaultLeadValues);
    setDrawerOpen(true);
  }

  function openEditDrawer(lead: Lead) {
    setEditingLead(lead);
    form.setFieldsValue({
      fullName: lead.fullName,
      phone: lead.phone,
      secondaryPhone: lead.secondaryPhone,
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
      subject: lead.subject,
      source: lead.source,
      status: lead.status,
      preferredGroupId: lead.preferredGroupId,
      trialGroupId: lead.trialGroupId,
      trialDate: lead.trialDate ? dayjs(lead.trialDate) : null,
      nextContactAt: lead.nextContactAt ? dayjs(lead.nextContactAt) : null,
      lostReason: lead.lostReason,
      note: lead.note,
      activityNote: '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingLead(null);
    form.resetFields();
  }

  function openConvertModal(lead: Lead) {
    setConvertLeadRecord(lead);
    convertForm.setFieldsValue({
      groupId: lead.preferredGroupId || lead.trialGroupId || undefined,
      discountType: 'none',
      discountValue: 0,
      discountReason: '',
      note: '',
    });
  }

  async function handleSubmit(values: LeadFormValues) {
    try {
      const payload = toLeadPayload(values);

      if (editingLead) {
        await updateLead({ id: editingLead.id, body: payload }).unwrap();
        message.success('Lead yangilandi');
      } else {
        await createLead(payload).unwrap();
        message.success('Lead yaratildi');
      }

      closeDrawer();
    } catch (error) {
      message.error(getErrorMessage(error, 'Leadni saqlab bo‘lmadi'));
    }
  }

  async function handleConvert(values: ConvertFormValues) {
    if (!convertLeadRecord) return;

    try {
      await convertLead({ id: convertLeadRecord.id, body: values }).unwrap();
      message.success('Lead studentga aylantirildi');
      setConvertLeadRecord(null);
      convertForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, 'Leadni studentga aylantirib bo‘lmadi'));
    }
  }

  function confirmDelete(lead: Lead) {
    Modal.confirm({
      title: "Leadni o'chirish",
      content: `${lead.fullName} leadi o'chiriladi. Davom etasizmi?`,
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isDeleting },
      async onOk() {
        try {
          await deleteLead(lead.id).unwrap();
          message.success("Lead o'chirildi");
        } catch (error) {
          message.error(getErrorMessage(error, "Leadni o'chirib bo'lmadi"));
        }
      },
    });
  }

  function clearFilters() {
    setFilters({ view: 'active' });
    setPage(1);
  }

  function renderLeadActions(record: Lead) {
    const actionItems = [
      {
        key: 'history',
        label: 'Tarix',
        icon: <History size={14} />,
        onClick: () => setDetailsLead(record),
      },
      record.status !== 'converted' && record.status !== 'lost'
        ? {
            key: 'edit',
            label: 'Tahrirlash',
            icon: <Edit3 size={14} />,
            onClick: () => openEditDrawer(record),
          }
        : null,
      record.status !== 'converted' && record.status !== 'lost'
        ? {
            key: 'convert',
            label: 'Studentga aylantirish',
            icon: <GraduationCap size={14} />,
            onClick: () => openConvertModal(record),
          }
        : null,
      {
        key: 'delete',
        label: "O'chirish",
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => confirmDelete(record),
      },
    ].filter(Boolean) as Array<{
      key: string;
      label: string;
      icon: JSX.Element;
      danger?: boolean;
      onClick: () => void;
    }>;

    if (actionMenuCompact) {
      return (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: actionItems.map((item) => ({
              key: item.key,
              label: item.label,
              icon: item.icon,
              danger: item.danger,
            })),
            onClick: ({ key }) => {
              const item = actionItems.find((entry) => entry.key === key);
              item?.onClick();
            },
          }}
        >
          <Button className="lead-actions-more-button" type="text" icon={<EllipsisVertical size={18} />} />
        </Dropdown>
      );
    }

    return (
      <Space>
        <Tooltip title="Tarix">
          <Button size="small" icon={<History size={16} />} onClick={() => setDetailsLead(record)} />
        </Tooltip>
        {record.status !== 'converted' && record.status !== 'lost' ? (
          <>
            <Tooltip title="Tahrirlash">
              <Button size="small" icon={<Edit3 size={16} />} onClick={() => openEditDrawer(record)} />
            </Tooltip>
            <Tooltip title="Studentga aylantirish">
              <Button size="small" className="action-finance-button" icon={<GraduationCap size={16} />} onClick={() => openConvertModal(record)} />
            </Tooltip>
          </>
        ) : null}
        <Button size="small" danger icon={<Trash2 size={16} />} onClick={() => confirmDelete(record)} />
      </Space>
    );
  }

  return (
    <section className="page">
      {isError ? <Alert className="page-alert" type="error" message="Leadlar ro'yxatini yuklab bo'lmadi." showIcon /> : null}

      <div className="filter-bar leads-filter-bar">
        <Input
          allowClear
          prefix={<Search size={16} />}
          placeholder="F.I.Sh, telefon yoki manba"
          value={filters.search}
          onChange={(event) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, search: event.target.value }));
          }}
        />
        <Button
          className="leads-filter-toggle"
          icon={<SlidersHorizontal size={16} />}
          onClick={() => setMobileFiltersOpen((open) => !open)}
          aria-expanded={mobileFiltersOpen}
        />
        <div className={`leads-filter-extra ${mobileFiltersOpen ? 'is-open' : ''}`}>
          <Select
            allowClear
            placeholder="Status"
            options={statusOptions}
            value={filters.status}
            onChange={(status) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, status }));
            }}
          />
          <Select
            allowClear
            placeholder="Fan"
            options={subjectOptions}
            value={filters.subject}
            onChange={(subject) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, subject }));
            }}
          />
          <Select
            placeholder="Ko‘rinish"
            value={filters.view}
            options={[
              { label: 'Faol leadlar', value: 'active' },
              { label: 'Yopilgan leadlar', value: 'closed' },
              { label: 'Hammasi', value: undefined },
            ]}
            onChange={(view) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, view }));
            }}
          />
          <Button icon={<X size={16} />} onClick={clearFilters}>
            Tozalash
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDrawer}>
            Lead qo'shish
          </Button>
        </div>
      </div>

      <Table
        className="leads-table"
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={leads}
        scroll={tableScroll}
        pagination={{
          current: pagination?.page || page,
          pageSize: pagination?.limit || limit,
          total: pagination?.total || 0,
          showSizeChanger: false,
          onChange: (nextPage) => setPage(nextPage),
        }}
        columns={[
          { title: 'F.I.Sh', dataIndex: 'fullName', width: compactDesktop ? 150 : 190, ellipsis: true },
          { title: 'Telefon', dataIndex: 'phone', width: compactDesktop ? 118 : 140, render: (value: string) => formatUzPhoneDisplay(value) },
          { title: 'Fan', dataIndex: 'subject', width: compactDesktop ? 90 : 110, ellipsis: true },
          { title: 'Manba', dataIndex: 'source', width: compactDesktop ? 92 : 110, render: (value) => value || '-' },
          {
            title: 'Status',
            dataIndex: 'status',
            width: compactDesktop ? 112 : 170,
            render: (status: LeadStatus) => <Tag color={statusMeta[status].color}>{statusMeta[status].label}</Tag>,
          },
          {
            title: 'Keyingi aloqa',
            dataIndex: 'nextContactAt',
            width: compactDesktop ? 124 : 145,
            render: formatDate,
          },
          {
            title: 'Guruh',
            dataIndex: 'preferredGroup',
            width: compactDesktop ? 128 : 150,
            ellipsis: true,
            render: (_value, record: Lead) => record.preferredGroup?.name || record.trialGroup?.name || '-',
          },
          {
            title: 'Amallar',
            width: compactDesktop ? 56 : 150,
            render: (_value, record: Lead) => renderLeadActions(record),
          },
        ]}
      />

      {!mobileView ? null : (
        <div className="leads-mobile-list">
          {leads.map((lead) => (
            <article className="leads-mobile-card" key={lead.id}>
              <div className="leads-mobile-card-header">
                <div className="stacked-cell">
                  <span>{lead.fullName}</span>
                  <small>{lead.subject} | {lead.source || '-'}</small>
                </div>
                <div className="leads-mobile-status">
                  <Tag color={statusMeta[lead.status].color}>{statusMeta[lead.status].label}</Tag>
                </div>
              </div>

              <div className="leads-mobile-details">
                <div>
                  <span>Telefon</span>
                  <strong>{formatUzPhoneDisplay(lead.phone)}</strong>
                </div>
                <div>
                  <span>Qo‘shimcha</span>
                  <strong>{lead.secondaryPhone ? formatUzPhoneDisplay(lead.secondaryPhone) : '-'}</strong>
                </div>
                <div>
                  <span>Ota-ona</span>
                  <strong>{lead.parentName || '-'}</strong>
                </div>
                <div>
                  <span>Ota-ona tel</span>
                  <strong>{lead.parentPhone ? formatUzPhoneDisplay(lead.parentPhone) : '-'}</strong>
                </div>
                <div>
                  <span>Guruh</span>
                  <strong>{lead.preferredGroup?.name || lead.trialGroup?.name || '-'}</strong>
                </div>
                <div>
                  <span>Sinov sanasi</span>
                  <strong>{formatDate(lead.trialDate)}</strong>
                </div>
                <div>
                  <span>Keyingi aloqa</span>
                  <strong>{formatDate(lead.nextContactAt)}</strong>
                </div>
              </div>

              <div className="leads-mobile-actions">
                <Button size="small" icon={<History size={16} />} onClick={() => setDetailsLead(lead)} />
                {lead.status !== 'converted' && lead.status !== 'lost' ? (
                  <>
                    <Button size="small" icon={<Edit3 size={16} />} onClick={() => openEditDrawer(lead)} />
                    <Button size="small" className="action-finance-button" icon={<GraduationCap size={16} />} onClick={() => openConvertModal(lead)} />
                  </>
                ) : null}
                <Button size="small" danger icon={<Trash2 size={16} />} onClick={() => confirmDelete(lead)} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        title={editingLead ? 'Leadni tahrirlash' : "Lead qo'shish"}
        width="min(680px, 100vw)"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={defaultLeadValues} onFinish={handleSubmit}>
          <div className="form-grid">
            <Form.Item name="fullName" label="F.I.Sh" rules={[{ required: true, message: "F.I.Sh kiriting" }]}>
              <Input placeholder="Masalan: Sardor Valiyev" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Telefon"
              normalize={formatUzPhone}
              rules={[
                { required: true, message: 'Telefon kiriting' },
                { pattern: /^\+998\d{9}$/, message: "Telefon raqam noto'g'ri kiritilgan" },
              ]}
            >
              <Input placeholder="+998 90 123 45 67" maxLength={13} />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item
              name="secondaryPhone"
              label="Ikkinchi telefon"
              normalize={formatUzPhone}
              rules={[{ pattern: /^$|^\+998\d{9}$/, message: "Telefon raqam noto'g'ri kiritilgan" }]}
            >
              <Input placeholder="+998 91 222 33 44" maxLength={13} />
            </Form.Item>
            <Form.Item name="source" label="Manba" rules={[{ required: true, message: 'Manba tanlang' }]}>
              <Select options={sourceOptions} placeholder="Bizni qayerdan topdi?" />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item name="subject" label="Fan" rules={[{ required: true, message: 'Fan tanlang' }]}>
              <Select options={subjectOptions} onChange={() => {
                form.setFieldValue('preferredGroupId', null);
                form.setFieldValue('trialGroupId', null);
              }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status tanlang' }]}>
              <Select options={statusOptions.filter((status) => status.value !== 'converted')} />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item name="preferredGroupId" label="Mos guruh">
              <Select allowClear showSearch optionFilterProp="label" loading={isGroupsFetching} options={groupOptions} />
            </Form.Item>
            <Form.Item name="trialGroupId" label="Sinov darsi guruhi">
              <Select allowClear showSearch optionFilterProp="label" loading={isGroupsFetching} options={groupOptions} />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item name="trialDate" label="Sinov darsi sanasi">
              <DatePicker showTime className="full-width" format="DD.MM.YYYY HH:mm" />
            </Form.Item>
            <Form.Item name="nextContactAt" label="Keyingi aloqa">
              <DatePicker showTime className="full-width" format="DD.MM.YYYY HH:mm" />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item name="parentName" label="Ota-ona F.I.Sh">
              <Input placeholder="Masalan: Vali Valiyev" />
            </Form.Item>
            <Form.Item
              name="parentPhone"
              label="Ota-ona telefoni"
              normalize={formatUzPhone}
              rules={[{ pattern: /^$|^\+998\d{9}$/, message: "Telefon raqam noto'g'ri kiritilgan" }]}
            >
              <Input placeholder="+998 91 222 33 44" maxLength={13} />
            </Form.Item>
          </div>

          <Form.Item name="lostReason" label="Yo'qotilgan sabab">
            <Input placeholder="Masalan: vaqt mos kelmadi" />
          </Form.Item>
          <Form.Item name="activityNote" label="Status izohi">
            <Input placeholder="Status o'zgarganda tarixga yoziladi" />
          </Form.Item>
          <Form.Item name="note" label="Umumiy izoh">
            <TextArea rows={4} maxLength={500} showCount />
          </Form.Item>

          <div className="drawer-form-actions">
            <Button onClick={closeDrawer}>Bekor qilish</Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              Saqlash
            </Button>
          </div>
        </Form>
      </Drawer>

      <Modal
        title={convertLeadRecord ? `${convertLeadRecord.fullName} - studentga aylantirish` : 'Studentga aylantirish'}
        open={Boolean(convertLeadRecord)}
        onCancel={() => setConvertLeadRecord(null)}
        onOk={() => convertForm.submit()}
        okText="Studentga aylantirish"
        cancelText="Bekor qilish"
        confirmLoading={isConverting}
      >
        <Form form={convertForm} layout="vertical" onFinish={handleConvert}>
          <Form.Item name="groupId" label="Guruh" rules={[{ required: true, message: 'Guruh tanlang' }]}>
            <Select showSearch optionFilterProp="label" loading={isGroupsFetching} options={allGroupOptions} />
          </Form.Item>
          <div className="form-grid">
            <Form.Item name="discountType" label="Chegirma turi">
              <Select
                options={[
                  { label: "Yo'q", value: 'none' },
                  { label: 'Foiz', value: 'percentage' },
                  { label: 'Aniq summa', value: 'fixed' },
                ]}
              />
            </Form.Item>
            <Form.Item name="discountValue" label="Chegirma">
              <InputNumber className="full-width" min={0} />
            </Form.Item>
          </div>
          <Form.Item name="discountReason" label="Chegirma sababi">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <TextArea rows={3} maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={detailsLead ? `${detailsLead.fullName} - lead tarixi` : 'Lead tarixi'}
        open={Boolean(detailsLead)}
        onCancel={() => setDetailsLead(null)}
        footer={null}
      >
        <Timeline
          items={(detailsLead?.activityHistory || []).slice().reverse().map((activity) => ({
            color: statusMeta[activity.status].color,
            children: (
              <div className="lead-history-item">
                <strong>{statusMeta[activity.status].label}</strong>
                <span>{formatDate(activity.createdAt)}</span>
                {activity.note ? <p>{activity.note}</p> : null}
              </div>
            ),
          }))}
        />
      </Modal>
    </section>
  );
}
