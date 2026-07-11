import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Dropdown,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Tooltip,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Archive, Edit3, EllipsisVertical, History, Info, Plus, Search, SlidersHorizontal, Trash2, UsersRound, X } from 'lucide-react';
import {
  Group,
  GroupFilters,
  GroupPayload,
  Student,
  useCreateGroupMutation,
  useDeleteGroupMutation,
  useGetGroupsQuery,
  useGetRoomsQuery,
  useGetSubjectsQuery,
  useGetStudentsQuery,
  useGetTeachersQuery,
  useUpdateGroupMutation,
  WeekDay,
} from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import { formatUzPhoneDisplay } from '../../utils/phone';
const { TextArea } = Input;

const fallbackSubjectOptions = [
  { label: 'Buxgalteriya', value: 'Buxgalteriya' },
  { label: 'IT', value: 'IT' },
  { label: 'Ingliz tili', value: 'Ingliz tili' },
  { label: 'Matematika', value: 'Matematika' },
  { label: 'Boshqa', value: 'Boshqa' },
];

const statusOptions = [
  { label: 'Faol', value: 'active' },
  { label: 'Nofaol', value: 'inactive' },
];

const lessonDayOptions: { label: string; value: WeekDay }[] = [
  { label: 'Dushanba', value: 'monday' },
  { label: 'Seshanba', value: 'tuesday' },
  { label: 'Chorshanba', value: 'wednesday' },
  { label: 'Payshanba', value: 'thursday' },
  { label: 'Juma', value: 'friday' },
  { label: 'Shanba', value: 'saturday' },
  { label: 'Yakshanba', value: 'sunday' },
];

const dayLabels = new Map(lessonDayOptions.map((day) => [day.value, day.label]));

type GroupFormValues = Omit<GroupPayload, 'startTime' | 'endTime' | 'startDate'> & {
  startTime?: Dayjs | null;
  endTime?: Dayjs | null;
  startDate?: Dayjs | null;
};

const defaultValues: GroupFormValues = {
  name: '',
  subject: 'IT',
  teacherId: '',
  room: '',
  lessonDays: [],
  startTime: '',
  endTime: '',
  startDate: null,
  monthlyPrice: 0,
  priceChangeReason: '',
  isEnrollmentOpen: true,
  status: 'active',
  note: '',
};

function parseTime(value?: string) {
  return value ? dayjs(value, 'HH:mm') : null;
}

function formatTime(value?: Dayjs | null) {
  return value ? value.format('HH:mm') : '';
}

function timeToMinutes(value?: string) {
  const [hours = '0', minutes = '0'] = value?.split(':') || [];

  return Number(hours) * 60 + Number(minutes);
}

function isEndTimeAfterStart(startTime?: Dayjs | null, endTime?: Dayjs | null) {
  if (!startTime || !endTime) {
    return true;
  }

  return endTime.isAfter(startTime);
}

function hasTimeOverlap(firstStart?: string, firstEnd?: string, secondStart?: string, secondEnd?: string) {
  if (!firstStart || !firstEnd || !secondStart || !secondEnd) return false;

  return timeToMinutes(firstStart) < timeToMinutes(secondEnd) && timeToMinutes(secondStart) < timeToMinutes(firstEnd);
}

function hasSharedLessonDay(firstDays: WeekDay[] = [], secondDays: WeekDay[] = []) {
  return firstDays.some((day) => secondDays.includes(day));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

function GroupStatusTag({ status }: { status: Group['status'] }) {
  if (status === 'active') return <Tag color="green">Faol</Tag>;
  if (status === 'archived') return <Tag color="default">Arxiv</Tag>;
  return <Tag color="red">Nofaol</Tag>;
}

function formatSchedule(group: Group) {
  const days = group.lessonDays?.map((day) => dayLabels.get(day)).filter(Boolean).join(', ');
  const time = group.startTime && group.endTime ? `${group.startTime}-${group.endTime}` : '-';

  return (
    <div className="schedule-cell">
      <span>{time}</span>
      <small>{days || '-'}</small>
    </div>
  );
}

function formatMoney(value: number) {
  return `${Number(value).toLocaleString('uz-UZ')} so'm`;
}

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString('uz-UZ');
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD.MM.YYYY HH:mm') : 'Hozirgacha';
}

type GroupsPageProps = {
  archivedOnly?: boolean;
};

export default function GroupsPage({ archivedOnly = false }: GroupsPageProps) {
  const { user } = useAuth();
  const [form] = Form.useForm<GroupFormValues>();
  const [filters, setFilters] = useState<GroupFilters>({});
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [historyGroup, setHistoryGroup] = useState<Group | null>(null);
  const [studentsGroup, setStudentsGroup] = useState<Group | null>(null);
  const [detailsGroup, setDetailsGroup] = useState<Group | null>(null);
  const selectedSubject = Form.useWatch('subject', form);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      status: archivedOnly ? 'archived' : filters.status,
      search: filters.search?.trim() || undefined,
      page,
      limit,
    }),
    [archivedOnly, filters, limit, page],
  );

  const { data: groupsResponse, isError, isFetching } = useGetGroupsQuery(queryFilters);
  const { data: activeGroupsResponse } = useGetGroupsQuery({ status: 'active', limit: 100 });
  const { data: subjectsResponse } = useGetSubjectsQuery();
  const { data: roomsResponse } = useGetRoomsQuery();
  const { data: groupStudentsResponse, isFetching: isGroupStudentsFetching } = useGetStudentsQuery(
    studentsGroup ? { groupId: studentsGroup.id, limit: 100 } : undefined,
    { skip: !studentsGroup },
  );
  const { data: teachersResponse, isFetching: isTeachersFetching } = useGetTeachersQuery({ limit: 100, status: 'active' });
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation();

  const groups = groupsResponse?.data || [];
  const activeGroups = activeGroupsResponse?.data || [];
  const subjectOptions = (subjectsResponse?.data.length ? subjectsResponse.data : fallbackSubjectOptions.map((subject) => subject.value))
    .map((subject) => ({ label: subject, value: subject }));
  const pagination = groupsResponse?.pagination;
  const roomOptions = (roomsResponse?.data || []).map((room) => ({ label: room, value: room }));
  const isSaving = isCreating || isUpdating;
  const canModifyGroups = user?.role !== 'teacher';
  const allTeacherOptions =
    teachersResponse?.data.map((teacher) => ({
      label: teacher.fullName,
      value: teacher.id,
      subject: teacher.subject,
    })) || [];
  const drawerTeacherOptions = allTeacherOptions.filter((teacher) => teacher.subject === selectedSubject);
  const filterTeacherOptions = allTeacherOptions.map(({ label, value }) => ({ label, value }));
  const compactDesktop = viewportWidth < 1280;
  const tighterDesktop = viewportWidth <= 1120;
  const actionMenuCompact = viewportWidth <= 1260;
  const actionIconSize = compactDesktop ? 16 : 17;
  const tableScrollX = archivedOnly
    ? (compactDesktop ? 900 : 980)
    : (compactDesktop ? 1080 : 1180);
  const tableScroll = viewportWidth > 1120 ? { x: tableScrollX } : undefined;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function openCreateDrawer() {
    setEditingGroup(null);
    form.setFieldsValue({ ...defaultValues, startDate: dayjs().startOf('day') });
    setDrawerOpen(true);
  }

  function openEditDrawer(group: Group) {
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      subject: group.subject,
      teacherId: group.teacherId,
      room: group.room || '',
      lessonDays: group.lessonDays || [],
      startTime: parseTime(group.startTime),
      endTime: parseTime(group.endTime),
      startDate: dayjs(group.startDate || group.createdAt),
      monthlyPrice: group.monthlyPrice || 0,
      priceChangeReason: '',
      isEnrollmentOpen: group.isEnrollmentOpen !== false,
      status: group.status,
      note: group.note || '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingGroup(null);
    form.resetFields();
  }

  async function handleSubmit(values: GroupFormValues) {
    const payload: GroupPayload = {
      ...values,
      monthlyPrice: Number(values.monthlyPrice) || 0,
      startTime: formatTime(values.startTime),
      endTime: formatTime(values.endTime),
      startDate: values.startDate?.format('YYYY-MM-DD') || '',
    };
    const roomConflict = activeGroups.find((group) => (
      group.id !== editingGroup?.id &&
      group.room === payload.room &&
      hasSharedLessonDay(group.lessonDays, payload.lessonDays) &&
      hasTimeOverlap(payload.startTime, payload.endTime, group.startTime, group.endTime)
    ));

    if (roomConflict) {
      message.error(`${payload.room} xonada shu kun va vaqt oralig'ida "${roomConflict.name}" guruhi bor`);
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup({ id: editingGroup.id, body: payload }).unwrap();
        message.success("Guruh ma'lumoti yangilandi");
      } else {
        await createGroup({ ...payload, status: 'active', isEnrollmentOpen: true, priceChangeReason: '' }).unwrap();
        message.success("Guruh qo'shildi");
      }

      closeDrawer();
    } catch (error) {
      message.error(getErrorMessage(error, 'Guruhni saqlab bo\'lmadi'));
    }
  }

  function confirmDelete(group: Group) {
    Modal.confirm({
      title: "Guruhni o'chirish",
      content: `${group.name} ma'lumotlari o'chiriladi. Davom etasizmi?`,
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isDeleting },
      async onOk() {
        try {
          await deleteGroup(group.id).unwrap();
          message.success("Guruh o'chirildi");
        } catch (error) {
          message.error(getErrorMessage(error, "Guruhni o'chirib bo'lmadi"));
        }
      },
    });
  }

  function confirmArchive(group: Group) {
    Modal.confirm({
      title: 'Guruhni arxivlash',
      content: `${group.name} arxivlanadi. Shu vaqtdan boshlab qabul yopiladi va keyingi to'lovlar hisoblanmaydi.`,
      okText: 'Arxivlash',
      cancelText: 'Bekor qilish',
      okButtonProps: { loading: isUpdating },
      async onOk() {
        try {
          await updateGroup({
            id: group.id,
            body: {
              name: group.name,
              subject: group.subject,
              teacherId: group.teacherId,
              room: group.room,
              lessonDays: group.lessonDays,
              startTime: group.startTime,
              endTime: group.endTime,
              startDate: group.startDate || group.createdAt,
              monthlyPrice: group.monthlyPrice,
              isEnrollmentOpen: false,
              status: 'archived',
              note: group.note || '',
            },
          }).unwrap();
          message.success('Guruh arxivlandi');
        } catch (error) {
          message.error(getErrorMessage(error, 'Guruhni arxivlab bo\'lmadi'));
        }
      },
    });
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  function toggleMobileFilters() {
    setMobileFiltersOpen((prev) => !prev);
  }

  function renderGroupCardActions(record: Group) {
    return (
      <Space wrap className="groups-mobile-action-buttons">
        {archivedOnly ? (
          <Tooltip title="Guruh haqida">
            <Button className="action-info-button" size="small" icon={<Info size={17} />} onClick={() => setDetailsGroup(record)} />
          </Tooltip>
        ) : null}
        <Tooltip title="Narx tarixi">
          <Button className="action-history-button" size="small" icon={<History size={17} />} onClick={() => setHistoryGroup(record)} />
        </Tooltip>
        <Tooltip title="Guruh o'quvchilari">
          <Button className="action-finance-button" size="small" icon={<UsersRound size={17} />} onClick={() => setStudentsGroup(record)} />
        </Tooltip>
        {!archivedOnly && canModifyGroups ? (
          <Tooltip title="Tahrirlash">
            <Button className="action-edit-button" size="small" icon={<Edit3 size={17} />} onClick={() => openEditDrawer(record)} />
          </Tooltip>
        ) : null}
        {!archivedOnly && canModifyGroups && record.status !== 'archived' ? (
          <Tooltip title="Arxivlash">
            <Button size="small" icon={<Archive size={17} />} onClick={() => confirmArchive(record)} />
          </Tooltip>
        ) : null}
        {!archivedOnly && canModifyGroups ? (
          <Tooltip title="O'chirish">
            <Button size="small" danger icon={<Trash2 size={17} />} onClick={() => confirmDelete(record)} />
          </Tooltip>
        ) : null}
      </Space>
    );
  }

  function renderGroupActions(record: Group) {
    const actionItems = [
      archivedOnly ? (
        {
          key: 'details',
          label: 'Guruh haqida',
          icon: <Info size={14} />,
          onClick: () => setDetailsGroup(record),
        }
      ) : null,
      {
        key: 'history',
        label: 'Narx tarixi',
        icon: <History size={14} />,
        onClick: () => setHistoryGroup(record),
      },
      {
        key: 'students',
        label: "Guruh o'quvchilari",
        icon: <UsersRound size={14} />,
        onClick: () => setStudentsGroup(record),
      },
      !archivedOnly && canModifyGroups
        ? {
            key: 'edit',
            label: 'Tahrirlash',
            icon: <Edit3 size={14} />,
            onClick: () => openEditDrawer(record),
          }
        : null,
      !archivedOnly && canModifyGroups && record.status !== 'archived'
        ? {
            key: 'archive',
            label: 'Arxivlash',
            icon: <Archive size={14} />,
            onClick: () => confirmArchive(record),
          }
        : null,
      !archivedOnly && canModifyGroups
        ? {
            key: 'delete',
            label: "O'chirish",
            icon: <Trash2 size={14} />,
            danger: true,
            onClick: () => confirmDelete(record),
          }
        : null,
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
          <Tooltip title="Amallar">
            <Button
              className="group-actions-more-button"
              type="text"
              aria-label="Amallar"
              icon={<EllipsisVertical size={18} />}
            />
          </Tooltip>
        </Dropdown>
      );
    }

    return (
      <Space wrap>
        {archivedOnly ? (
          <Tooltip title="Guruh haqida">
            <Button
              className="action-info-button"
              size="small"
              icon={<Info size={actionIconSize} />}
              onClick={() => setDetailsGroup(record)}
            />
          </Tooltip>
        ) : null}
        <Tooltip title="Narx tarixi">
          <Button
            className="action-history-button"
            size="small"
            icon={<History size={actionIconSize} />}
            onClick={() => setHistoryGroup(record)}
          />
        </Tooltip>
        <Tooltip title="Guruh o'quvchilari">
          <Button
            className="action-finance-button"
            size="small"
            icon={<UsersRound size={actionIconSize} />}
            onClick={() => setStudentsGroup(record)}
          />
        </Tooltip>
        {!archivedOnly && canModifyGroups ? (
          <>
            <Tooltip title="Tahrirlash">
              <Button
                className="action-edit-button"
                size="small"
                icon={<Edit3 size={actionIconSize} />}
                onClick={() => openEditDrawer(record)}
              />
            </Tooltip>
            {record.status !== 'archived' ? (
              <Tooltip title="Arxivlash">
                <Button
                  className="action-archive-button"
                  size="small"
                  icon={<Archive size={actionIconSize} />}
                  onClick={() => confirmArchive(record)}
                />
              </Tooltip>
            ) : null}
            <Button size="small" danger icon={<Trash2 size={actionIconSize} />} onClick={() => confirmDelete(record)} />
          </>
        ) : null}
      </Space>
    );
  }

  return (
    <section className="page">
      {isError ? <Alert className="page-alert" type="error" message="Guruhlar ma'lumotini yuklab bo'lmadi." showIcon /> : null}

      <div className={`filter-bar ${archivedOnly ? 'archived-groups-filter-bar' : 'groups-filter-bar'}`}>
        <Input
          allowClear
          prefix={<Search size={16} />}
          placeholder="Guruh nomi, fan yoki xona bo'yicha qidirish"
          value={filters.search}
          onChange={(event) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, search: event.target.value }));
          }}
        />
        <Button
          className="groups-filter-toggle"
          icon={<SlidersHorizontal size={16} />}
          aria-label="Filtr"
          onClick={toggleMobileFilters}
        >
        </Button>
        <div className={`groups-filter-extra ${mobileFiltersOpen ? 'is-open' : ''}`}>
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
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="O'qituvchi"
            loading={isTeachersFetching}
            options={filterTeacherOptions}
            value={filters.teacherId}
            onChange={(teacherId) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, teacherId }));
            }}
          />
          {!archivedOnly ? (
            <Select
              allowClear
              placeholder="Holat"
              options={statusOptions}
              value={filters.status}
              onChange={(status) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status }));
              }}
            />
          ) : null}
          <Button icon={<X size={16} />} onClick={clearFilters}>
            Tozalash
          </Button>
          {!archivedOnly ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDrawer}>
              Guruh qo'shish
            </Button>
          ) : null}
        </div>
      </div>

      <Table
        className="groups-table"
        rowKey="id"
        size="small"
        loading={isFetching}
        scroll={tableScroll}
        dataSource={groups}
        pagination={{
          current: pagination?.page || page,
          pageSize: pagination?.limit || limit,
          total: pagination?.total || 0,
          showSizeChanger: false,
          onChange: (nextPage) => setPage(nextPage),
        }}
        columns={[
          { title: 'Guruh nomi', dataIndex: 'name', width: compactDesktop ? 104 : 120, ellipsis: true },
          { title: 'Fan', dataIndex: 'subject', width: compactDesktop ? 76 : 90, ellipsis: true },
          {
            title: "O'qituvchi",
            dataIndex: 'teacher',
            width: compactDesktop ? (tighterDesktop ? 130 : 150) : 130,
            ellipsis: true,
            render: (_value, record: Group) => record.teacher?.fullName || '-',
          },
          {
            title: 'Jadval',
            dataIndex: 'lessonDays',
            width: compactDesktop ? (tighterDesktop ? 135 : 150) : 130,
            render: (_value, record: Group) => formatSchedule(record),
          },
          {
            title: 'Narx',
            dataIndex: 'monthlyPrice',
            width: compactDesktop ? (tighterDesktop ? 98 : 108) : 120,
            render: (value) => (value ? formatMoney(value) : '-'),
          },
          { title: "O'quvchi", dataIndex: 'studentsCount', width: compactDesktop ? 60 : 55, align: 'center' },
          {
            title: 'Holat',
            dataIndex: 'status',
            width: compactDesktop ? 75 : 70,
            align: 'center',
            render: (status, record: Group) => (
              <Space direction="vertical" align="start" size={1}>
                <GroupStatusTag status={status} />
                <Tag color={record.isEnrollmentOpen ? 'blue' : 'default'}>
                  {record.isEnrollmentOpen ? 'Qabul ochiq' : 'Qabul yopiq'}
                </Tag>
              </Space>
            ),
          },
          {
            title: 'Amallar',
            width: actionMenuCompact ? (tighterDesktop ? 54 : 64) : (archivedOnly ? (compactDesktop ? 96 : 104) : (compactDesktop ? 128 : 144)),
            render: (_value, record) => renderGroupActions(record),
          },
        ]}
      />

      <div className="groups-mobile-list">
        {groups.map((group) => (
          <article className="groups-mobile-card" key={group.id}>
            <div className="groups-mobile-card-header">
              <div className="stacked-cell">
                <span>{group.name}</span>
                <small>{group.subject} | {group.teacher?.fullName || '-'}</small>
              </div>
              <div className="groups-mobile-status">
                <GroupStatusTag status={group.status} />
                <Tag color={group.isEnrollmentOpen ? 'blue' : 'default'}>
                  {group.isEnrollmentOpen ? 'Qabul ochiq' : 'Qabul yopiq'}
                </Tag>
              </div>
            </div>

            <div className="groups-mobile-details">
              <div>
                <span>Xona</span>
                <strong>{group.room || '-'}</strong>
              </div>
              <div>
                <span>O'quvchilar</span>
                <strong>{formatNumber(group.studentsCount)}</strong>
              </div>
              <div>
                <span>Jadval</span>
                <div className="groups-mobile-value groups-mobile-schedule">{formatSchedule(group)}</div>
              </div>
              <div>
                <span>Narx</span>
                <strong>{group.monthlyPrice ? formatMoney(group.monthlyPrice) : '-'}</strong>
              </div>
            </div>

            <div className="groups-mobile-actions-row">
              <div className="groups-mobile-actions">
                {renderGroupCardActions(group)}
              </div>
            </div>

          </article>
        ))}
      </div>

      <Modal
        title={detailsGroup ? `${detailsGroup.name} - guruh haqida` : 'Guruh haqida'}
        open={Boolean(detailsGroup)}
        onCancel={() => setDetailsGroup(null)}
        footer={null}
        width={520}
      >
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Guruh ochilgan">{formatDate(detailsGroup?.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Dars boshlangan">
            {formatDate(detailsGroup?.startDate || detailsGroup?.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Arxivlangan">{formatDate(detailsGroup?.endedAt)}</Descriptions.Item>
        </Descriptions>
      </Modal>

      <Drawer
        title={editingGroup ? 'Guruhni tahrirlash' : "Guruh qo'shish"}
        width="min(620px, 100vw)"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={defaultValues} onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Guruh nomi"
            rules={[
              { required: true, message: 'Guruh nomini kiriting' },
              { min: 2, message: 'Kamida 2 ta belgi kiriting' },
            ]}
          >
            <Input placeholder="Masalan: Frontend N15" />
          </Form.Item>

          <div className="form-grid">
            <Form.Item name="subject" label="Fan" rules={[{ required: true, message: 'Fan tanlang' }]}>
              <Select options={subjectOptions} onChange={() => form.setFieldValue('teacherId', '')} />
            </Form.Item>
            {editingGroup ? (
              <Form.Item name="status" label="Holat" rules={[{ required: true, message: 'Holat tanlang' }]}>
                <Select options={statusOptions} />
              </Form.Item>
            ) : null}
          </div>

          {editingGroup ? (
            <Form.Item name="isEnrollmentOpen" label="Qabul ochiq" valuePropName="checked">
              <Switch checkedChildren="Ochiq" unCheckedChildren="Yopiq" />
            </Form.Item>
          ) : null}

          <Form.Item name="teacherId" label="O'qituvchi" rules={[{ required: true, message: "O'qituvchi tanlang" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              loading={isTeachersFetching}
              options={drawerTeacherOptions}
              placeholder="Tanlangan fan bo'yicha o'qituvchi tanlang"
              notFoundContent="Bu fan bo'yicha faol o'qituvchi yo'q"
            />
          </Form.Item>

          <div className="form-grid">
            <Form.Item name="room" label="Xona" rules={[{ required: true, message: 'Xona kiriting' }]}>
              <AutoComplete options={roomOptions} placeholder="Masalan: 2-xona" filterOption />
            </Form.Item>
            <Form.Item
              name="monthlyPrice"
              label="Oylik to'lov"
              rules={[
                { required: true, message: "Oylik to'lov kiriting" },
                {
                  type: 'number',
                  min: 1,
                  message: "Oylik to'lov 0 dan katta bo'lishi kerak",
                },
              ]}
            >
              <InputNumber
                min={0}
                addonAfter="so'm"
                className="full-width"
                formatter={(value) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => Number(value?.replace(/\s/g, '') || 0)}
              />
            </Form.Item>
          </div>

          {editingGroup ? (
            <Form.Item name="priceChangeReason" label="Narx o'zgarish sababi">
              <Input placeholder="Masalan: yangi oy uchun narx o'zgardi" />
            </Form.Item>
          ) : null}

          <Form.Item
            name="lessonDays"
            label="Dars kunlari"
            rules={[{ required: true, message: 'Kamida bitta dars kuni tanlang' }]}
          >
            <Select mode="multiple" options={lessonDayOptions} placeholder="Kunlarni tanlang" />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Dars boshlanish sanasi"
            rules={[{ required: true, message: 'Dars boshlanish sanasini tanlang' }]}
          >
            <DatePicker className="full-width" format="DD.MM.YYYY" placeholder="Sanani tanlang" />
          </Form.Item>

          <div className="form-grid">
            <Form.Item
              name="startTime"
              label="Boshlanish vaqti"
              rules={[{ required: true, message: 'Boshlanish vaqtini tanlang' }]}
            >
              <TimePicker format="HH:mm" minuteStep={5} className="full-width" placeholder="09:00" />
            </Form.Item>
            <Form.Item
              name="endTime"
              label="Tugash vaqti"
              dependencies={['startTime']}
              rules={[
                { required: true, message: 'Tugash vaqtini tanlang' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (isEndTimeAfterStart(getFieldValue('startTime'), value)) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak"));
                  },
                }),
              ]}
            >
              <TimePicker format="HH:mm" minuteStep={5} className="full-width" placeholder="11:00" />
            </Form.Item>
          </div>

          <Form.Item name="note" label="Izoh">
            <TextArea rows={4} placeholder="Guruh haqida qo'shimcha ma'lumot" maxLength={500} showCount />
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
        title={studentsGroup ? `${studentsGroup.name} - o'quvchilar` : "Guruh o'quvchilari"}
        open={Boolean(studentsGroup)}
        onCancel={() => setStudentsGroup(null)}
        footer={null}
        width={820}
      >
        <Table
          rowKey="id"
          size="small"
          loading={isGroupStudentsFetching}
          dataSource={groupStudentsResponse?.data || []}
          pagination={false}
          scroll={{ x: 680 }}
          columns={[
            { title: "F.I.Sh", dataIndex: 'fullName' },
            { title: 'Telefon', dataIndex: 'phone', render: (value: string) => formatUzPhoneDisplay(value) },
            {
              title: 'Holat',
              dataIndex: 'status',
              render: (value: Student['status']) => {
                if (value === 'active') return <Tag color="green">Faol</Tag>;
                if (value === 'paused') return <Tag color="orange">Pauzada</Tag>;
                if (value === 'left') return <Tag color="red">Ketgan</Tag>;
                return <Tag>Nofaol</Tag>;
              },
            },
            {
              title: "To'lov",
              dataIndex: 'paymentStatus',
              render: (value: Student['paymentStatus']) => (value === 'paid' ? <Tag color="green">To'langan</Tag> : <Tag color="red">Qarzdor</Tag>),
            },
          ]}
        />
      </Modal>

      <Modal
        title={historyGroup ? `${historyGroup.name} - oylik to'lov tarixi` : "Oylik to'lov tarixi"}
        open={Boolean(historyGroup)}
        onCancel={() => setHistoryGroup(null)}
        footer={null}
        width={760}
      >
        <Table
          rowKey={(record) => `${record.startedAt}-${record.price}`}
          size="small"
          pagination={false}
          dataSource={historyGroup?.priceHistory || []}
          columns={[
            {
              title: 'Narx',
              dataIndex: 'price',
              render: (value) => formatMoney(value),
            },
            {
              title: 'Boshlangan',
              dataIndex: 'startedAt',
              render: (value) => formatDate(value),
            },
            {
              title: 'Tugagan',
              dataIndex: 'endedAt',
              render: (value) => formatDate(value),
            },
            {
              title: 'Sabab',
              dataIndex: 'reason',
              render: (value) => value || '-',
            },
          ]}
        />
      </Modal>
    </section>
  );
}
