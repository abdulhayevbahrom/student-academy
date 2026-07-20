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
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { ArrowRightLeft, CircleDollarSign, Edit3, EllipsisVertical, Info, PauseCircle, Plus, Printer, Search, SlidersHorizontal, Trash2, UserMinus, X } from 'lucide-react';
import {
  Payment,
  Student,
  StudentFilters,
  StudentPayload,
  PaymentMethod,
  StudentMonthlyBalance,
  useActivatePausedStudentMutation,
  useCreateStudentMutation,
  useCreatePaymentMutation,
  useCreateStudentPauseMutation,
  useDeleteStudentMutation,
  useGetGroupsQuery,
  useGetSubjectsQuery,
  useGetStudentFinanceQuery,
  useGetStudentsQuery,
  useUpdateStudentMutation,
  Group,
  useGetBrandingSettingsQuery,
  useAddStudentEnrollmentMutation,
  useUpdateStudentEnrollmentMutation,
  useLeaveStudentMutation,
  useReversePaymentMutation,
} from '../../services/api';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import BrandIdentity from '../../components/BrandIdentity';
import { UNIFY_BRAND } from '../../config/branding';
import { useAuth } from '../../auth/AuthContext';
import { formatUzPhone, formatUzPhoneDisplay } from '../../utils/phone';

const { TextArea } = Input;

const statusOptions = [
  { label: 'Faol', value: 'active' },
  { label: 'Nofaol', value: 'inactive' },
  { label: 'Pauzada', value: 'paused' },
  { label: 'Ketgan', value: 'left' },
];

const paymentStatusOptions = [
  { label: "To'langan", value: 'paid' },
  { label: 'Qarzdor', value: 'debt' },
];

const sourceOptions = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Telegram', value: 'Telegram' },
  { label: 'Tavsiya', value: 'Tavsiya' },
  { label: 'Tashqi reklama', value: 'Tashqi reklama' },
  { label: 'Telefon', value: 'Telefon' },
  { label: 'Boshqa', value: 'Boshqa' },
];

const defaultValues: StudentPayload = {
  fullName: '',
  phone: '',
  secondaryPhone: '',
  parentName: '',
  parentPhone: '',
  source: '',
  groupId: '',
  allowClosedGroup: false,
  firstMonthBilling: 'prorated',
  status: 'active',
  paymentStatus: 'debt',
  note: '',
};

type StudentFormValues = StudentPayload & {
  subject?: string;
};

type MoveGroupFormValues = {
  subject?: string;
  groupId?: string;
};

type PaymentFormValues = {
  amount: number;
  method: PaymentMethod;
  note?: string;
};

type PauseFormValues = {
  startDate: dayjs.Dayjs;
  reason?: string;
};

type EnrollmentFormValues = {
  groupId: string;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  discountReason?: string;
};

const fallbackSubjectOptions = [
  { label: 'Buxgalteriya', value: 'Buxgalteriya' },
  { label: 'IT', value: 'IT' },
  { label: 'Ingliz tili', value: 'Ingliz tili' },
  { label: 'Matematika', value: 'Matematika' },
  { label: 'Boshqa', value: 'Boshqa' },
];

const dayLabels = new Map([
  ['monday', 'Dushanba'],
  ['tuesday', 'Seshanba'],
  ['wednesday', 'Chorshanba'],
  ['thursday', 'Payshanba'],
  ['friday', 'Juma'],
  ['saturday', 'Shanba'],
  ['sunday', 'Yakshanba'],
]);

const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
  { label: 'Naqd', value: 'cash' },
  { label: "Bank o'tkazma", value: 'bank_transfer' },
  { label: 'Click', value: 'click' },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

function StudentStatusTag({ status }: { status: Student['status'] }) {
  if (status === 'active') return <Tag color="green">Faol</Tag>;
  if (status === 'paused') return <Tag color="orange">Pauzada</Tag>;
  if (status === 'left') return <Tag color="red">Ketgan</Tag>;
  return <Tag color="default">Nofaol</Tag>;
}

function PaymentStatusTag({ status }: { status: Student['paymentStatus'] }) {
  return status === 'paid' ? <Tag color="green">To'langan</Tag> : <Tag color="red">Qarzdor</Tag>;
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString('uz-UZ')} so'm`;
}

function formatStudyDate(value?: string | null) {
  return value ? dayjs(value).format('DD.MM.YYYY') : 'Hozirgacha';
}

function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethodOptions.find((option) => option.value === method)?.label || method;
}

function PhoneCell({ student }: { student: Student }) {
  return (
    <div className="stacked-cell">
      <span>{formatUzPhoneDisplay(student.phone)}</span>
      <small>{student.secondaryPhone ? formatUzPhoneDisplay(student.secondaryPhone) : '-'}</small>
    </div>
  );
}

function formatGroupInfo(group?: Group) {
  if (!group) return null;

  return (
    <div className="group-admission-info">
      <span>{group.name}</span>
      <small>{group.teacher?.fullName || '-'} | {group.room} | {group.startTime}-{group.endTime}</small>
      <small>{formatDays(group)} | {Number(group.monthlyPrice).toLocaleString('uz-UZ')} so'm</small>
    </div>
  );
}

function formatDays(group: Group) {
  return group.lessonDays?.map((day) => dayLabels.get(day)).filter(Boolean).join(', ') || '-';
}

function renderGroupOption(group: Group) {
  return (
    <div className="group-select-option">
      <span className="group-option-subject">{group.subject}</span>
      <small className="group-option-time">{group.startTime}-{group.endTime}</small>
      <small className="group-option-days">{formatDays(group)}</small>
      <small className="group-option-teacher">{group.teacher?.fullName || '-'}</small>
    </div>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [form] = Form.useForm<StudentFormValues>();
  const [moveGroupForm] = Form.useForm<MoveGroupFormValues>();
  const [paymentForm] = Form.useForm<PaymentFormValues>();
  const [pauseForm] = Form.useForm<PauseFormValues>();
  const [enrollmentForm] = Form.useForm<EnrollmentFormValues>();
  const [filters, setFilters] = useState<StudentFilters>({});
  const [studentView, setStudentView] = useState<'current' | 'history'>('current');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [financeStudent, setFinanceStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [selectedPaymentBalance, setSelectedPaymentBalance] = useState<StudentMonthlyBalance | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [receipt, setReceipt] = useState<{ payment: Payment; monthLabel?: string; student: Student } | null>(null);
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);
  const [showClosedGroups, setShowClosedGroups] = useState(false);
  const [showClosedMoveGroups, setShowClosedMoveGroups] = useState(false);
  const { data: branding } = useGetBrandingSettingsQuery();
  const [addEnrollment, { isLoading: isEnrollmentSaving }] = useAddStudentEnrollmentMutation();
  const [updateEnrollment] = useUpdateStudentEnrollmentMutation();
  const [leaveStudent, { isLoading: isLeavingStudent }] = useLeaveStudentMutation();
  const [reversePayment] = useReversePaymentMutation();
  const selectedSubject = Form.useWatch('subject', form);
  const selectedGroupId = Form.useWatch('groupId', form);
  const selectedMoveSubject = Form.useWatch('subject', moveGroupForm);
  const selectedMoveGroupId = Form.useWatch('groupId', moveGroupForm);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      view: studentView,
      search: filters.search?.trim() || undefined,
      page,
      limit,
    }),
    [filters, limit, page, studentView],
  );

  const { data: studentsResponse, isError, isFetching } = useGetStudentsQuery(queryFilters);
  const { data: subjectsResponse } = useGetSubjectsQuery();
  const { data: groupsResponse, isFetching: isGroupsFetching } = useGetGroupsQuery({
    limit: 100,
    status: 'active',
  });
  const { data: financeData, isFetching: isFinanceFetching } = useGetStudentFinanceQuery(financeStudent?.id || '', {
    skip: !financeStudent,
  });
  const { data: editFinanceData } = useGetStudentFinanceQuery(editingStudent?.id || '', {
    skip: !editingStudent,
  });
  const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();
  const [createPayment, { isLoading: isPaymentSaving }] = useCreatePaymentMutation();
  const [createStudentPause, { isLoading: isPauseSaving }] = useCreateStudentPauseMutation();
  const [activatePausedStudent, { isLoading: isActivatingPausedStudent }] = useActivatePausedStudentMutation();

  const students = studentsResponse?.data || [];
  const subjectOptions = (subjectsResponse?.data.length ? subjectsResponse.data : fallbackSubjectOptions.map((subject) => subject.value))
    .map((subject) => ({ label: subject, value: subject }));
  const pagination = studentsResponse?.pagination;
  const isSaving = isCreating || isUpdating;
  const activeGroups = groupsResponse?.data || [];
  const isMobileView = viewportWidth <= 768;
  const showActionMenu = viewportWidth <= 1220;
  const selectedGroup = activeGroups.find((group) => group.id === selectedGroupId);
  const selectedMoveGroup = activeGroups.find((group) => group.id === selectedMoveGroupId);
  const groupOptions = activeGroups
    .filter((group) => (!selectedSubject || group.subject === selectedSubject) && (showClosedGroups || group.isEnrollmentOpen))
    .map((group) => ({
      label: renderGroupOption(group),
      value: group.id,
      title: `${group.name} (${group.subject})${group.isEnrollmentOpen ? '' : ' - qabul yopiq'}`,
    }));

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function toggleMobileFilters() {
    setMobileFiltersOpen((prev) => !prev);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
    setMobileFiltersOpen(false);
  }
  const filterGroupOptions =
    groupsResponse?.data.map((group) => ({
      label: `${group.name} (${group.subject})`,
      value: group.id,
    })) || [];
  const moveGroupOptions = activeGroups
    .filter((group) => (!selectedMoveSubject || group.subject === selectedMoveSubject) && (showClosedMoveGroups || group.isEnrollmentOpen))
    .map((group) => ({
      label: renderGroupOption(group),
      value: group.id,
      title: `${group.name} (${group.subject})${group.isEnrollmentOpen ? '' : ' - qabul yopiq'}`,
    }));

  function openCreateDrawer() {
    setEditingStudent(null);
    setShowSecondaryPhone(false);
    setShowClosedGroups(false);
    form.setFieldsValue({ ...defaultValues, subject: undefined, allowClosedGroup: false, firstMonthBilling: 'prorated' });
    setDrawerOpen(true);
  }

  function openEditDrawer(student: Student) {
    const currentGroup = activeGroups.find((group) => group.id === student.groupId) || student.group;
    const isCurrentGroupClosed = Boolean(currentGroup && !currentGroup.isEnrollmentOpen);

    setEditingStudent(student);
    form.setFieldsValue({
      fullName: student.fullName,
      phone: student.phone,
      secondaryPhone: student.secondaryPhone || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      source: student.source || '',
      subject: student.group?.subject,
      groupId: student.groupId,
      allowClosedGroup: isCurrentGroupClosed,
      status: student.status,
      paymentStatus: student.paymentStatus,
      note: student.note || '',
    });
    setShowSecondaryPhone(Boolean(student.secondaryPhone));
    setShowClosedGroups(isCurrentGroupClosed);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingStudent(null);
    form.resetFields();
  }

  function openMoveGroupModal(student: Student) {
    const currentGroup = activeGroups.find((group) => group.id === student.groupId) || student.group;
    const isCurrentGroupClosed = Boolean(currentGroup && !currentGroup.isEnrollmentOpen);

    setMovingStudent(student);
    setShowClosedMoveGroups(isCurrentGroupClosed);
    moveGroupForm.setFieldsValue({
      subject: student.group?.subject,
      groupId: student.groupId,
    });
  }

  function closeMoveGroupModal() {
    setMovingStudent(null);
    setShowClosedMoveGroups(false);
    moveGroupForm.resetFields();
  }

  function openFinanceModal(student: Student) {
    setFinanceStudent(student);
    paymentForm.setFieldsValue({
      method: 'cash',
    });
    pauseForm.resetFields();
  }

  function closeFinanceModal() {
    setFinanceStudent(null);
    setSelectedPaymentBalance(null);
    setReceipt(null);
    paymentForm.resetFields();
    pauseForm.resetFields();
  }

  async function handleSubmit(values: StudentFormValues) {
    const { subject: _subject, ...payloadValues } = values;
    const currentEditGroup = editingStudent
      ? activeGroups.find((group) => group.id === editingStudent.groupId) || editingStudent.group
      : null;
    const payload: StudentPayload = {
      ...payloadValues,
      status: editingStudent?.status || 'active',
      paymentStatus: editingStudent?.paymentStatus || 'debt',
      secondaryPhone: showSecondaryPhone ? payloadValues.secondaryPhone || '' : '',
      allowClosedGroup: editingStudent
        ? Boolean(currentEditGroup && !currentEditGroup.isEnrollmentOpen)
        : showClosedGroups && Boolean(selectedGroup && !selectedGroup.isEnrollmentOpen),
    };

    try {
      if (editingStudent) {
        await updateStudent({ id: editingStudent.id, body: payload }).unwrap();
        message.success("O'quvchi ma'lumoti yangilandi");
      } else {
        await createStudent(payload).unwrap();
        message.success("O'quvchi qo'shildi");
      }

      closeDrawer();
    } catch (error) {
      message.error(getErrorMessage(error, "O'quvchini saqlab bo'lmadi"));
    }
  }

  async function handleMoveGroup(values: MoveGroupFormValues) {
    if (!movingStudent || !values.groupId) return;

    try {
      await updateStudent({
        id: movingStudent.id,
        body: {
          fullName: movingStudent.fullName,
          phone: movingStudent.phone,
          secondaryPhone: movingStudent.secondaryPhone || '',
          parentName: movingStudent.parentName || '',
          parentPhone: movingStudent.parentPhone || '',
          groupId: values.groupId,
          allowClosedGroup: showClosedMoveGroups && Boolean(selectedMoveGroup && !selectedMoveGroup.isEnrollmentOpen),
          status: movingStudent.status,
          paymentStatus: movingStudent.paymentStatus,
          note: movingStudent.note || '',
        },
      }).unwrap();
      message.success("O'quvchi guruhi almashtirildi");
      closeMoveGroupModal();
    } catch (error) {
      message.error(getErrorMessage(error, "O'quvchi guruhini almashtirib bo'lmadi"));
    }
  }

  async function handlePaymentSubmit(values: PaymentFormValues) {
    if (!financeStudent) return;

    try {
      const payment = await createPayment({
        studentId: financeStudent.id,
        body: {
          amount: values.amount,
          method: values.method,
          note: values.note || '',
        },
      }).unwrap();
      setReceipt({ payment, student: financeStudent });
      paymentForm.resetFields();
      paymentForm.setFieldsValue({ method: 'cash' });
      message.success("To'lov saqlandi");
    } catch (error) {
      message.error(getErrorMessage(error, "To'lovni saqlab bo'lmadi"));
    }
  }

  function openBalancePaymentModal(balance: StudentMonthlyBalance) {
    setSelectedPaymentBalance(balance);
    setSelectedPaymentMethod('cash');
  }

  async function confirmBalancePayment() {
    if (!financeStudent || !selectedPaymentBalance) return;

    try {
      const payment = await createPayment({
        studentId: financeStudent.id,
        body: {
          amount: selectedPaymentBalance.debtAmount,
          method: selectedPaymentMethod,
          targetMonth: selectedPaymentBalance.month,
          targetBalanceId: selectedPaymentBalance.id,
          note: `${selectedPaymentBalance.month} oyi uchun to'lov`,
        },
      }).unwrap();

      setReceipt({ payment, monthLabel: selectedPaymentBalance.month, student: financeStudent });
      setSelectedPaymentBalance(null);
      message.success("To'lov saqlandi");
    } catch (error) {
      message.error(getErrorMessage(error, "To'lovni saqlab bo'lmadi"));
    }
  }

  function printReceipt() {
    window.print();
  }

  async function handleEnrollmentSubmit(values: EnrollmentFormValues) {
    if (!financeStudent) return;
    try {
      await addEnrollment({ studentId: financeStudent.id, body: { ...values, discountValue: values.discountValue || 0 } }).unwrap();
      enrollmentForm.resetFields();
      enrollmentForm.setFieldValue('discountType', 'none');
      message.success('Yangi kursga yozildi');
    } catch (error) {
      message.error(getErrorMessage(error, 'Kursga yozib bo‘lmadi'));
    }
  }

  function finishEnrollment(enrollmentId: string) {
    if (!financeStudent) return;
    Modal.confirm({
      title: 'Kursni yakunlash',
      content: 'O‘quvchining ushbu kurs bo‘yicha keyingi hisoblari to‘xtatiladi.',
      okText: 'Yakunlash',
      cancelText: 'Bekor qilish',
      onOk: () => updateEnrollment({ studentId: financeStudent.id, enrollmentId, body: { status: 'finished' } }).unwrap(),
    });
  }

  function editEnrollmentDiscount(record: { id: string; discountType: 'none' | 'percentage' | 'fixed'; discountValue: number; discountReason: string }) {
    if (!financeStudent) return;
    let discountType = record.discountType;
    let discountValue = record.discountValue;
    let discountReason = record.discountReason;
    Modal.confirm({
      className: 'enrollment-discount-confirm',
      title: 'Chegirmani o‘zgartirish',
      content: (
        <Space direction="vertical" className="full-width">
          <Select className="full-width" defaultValue={discountType} onChange={(value) => { discountType = value; }} options={[{ label: 'Chegirmasiz', value: 'none' }, { label: 'Foiz', value: 'percentage' }, { label: 'Belgilangan summa', value: 'fixed' }]} />
          <InputNumber className="full-width" min={0} defaultValue={discountValue} onChange={(value) => { discountValue = Number(value) || 0; }} />
          <Input defaultValue={discountReason} placeholder="Chegirma sababi" onChange={(event) => { discountReason = event.target.value; }} />
        </Space>
      ),
      okText: 'Saqlash',
      cancelText: 'Yopish',
      onOk: () => updateEnrollment({ studentId: financeStudent.id, enrollmentId: record.id, body: { discountType, discountValue, discountReason } }).unwrap(),
    });
  }

  function editFirstMonthBilling(record: { id: string; firstMonthBilling: 'prorated' | 'full' }) {
    if (!financeStudent) return;
    let firstMonthBilling = record.firstMonthBilling;
    Modal.confirm({
      title: 'Birinchi oy hisobini o‘zgartirish',
      content: (
        <Space direction="vertical" className="full-width">
          <Alert
            type="warning"
            showIcon
            message="Saqlanganda ushbu kurs bo‘yicha balans qayta hisoblanadi. Avvalgi to‘lovlar o‘chirilmaydi."
          />
          <Radio.Group
            defaultValue={firstMonthBilling}
            onChange={(event) => { firstMonthBilling = event.target.value; }}
          >
            <Space direction="vertical">
              <Radio value="prorated">Yangi o‘quvchi — qo‘shilgan sanadan oy oxirigacha</Radio>
              <Radio value="full">Oldindan o‘qiyotgan — oyning 1-sanasidan to‘liq oy</Radio>
            </Space>
          </Radio.Group>
        </Space>
      ),
      okText: 'Saqlash va qayta hisoblash',
      cancelText: 'Bekor qilish',
      onOk: async () => {
        await updateEnrollment({
          studentId: financeStudent.id,
          enrollmentId: record.id,
          body: { firstMonthBilling },
        }).unwrap();
        message.success('Birinchi oy hisobi yangilandi');
      },
    });
  }

  function confirmReversePayment(paymentId: string) {
    if (!financeStudent) return;
    let reason = '';
    Modal.confirm({
      title: 'To‘lovni bekor qilish / qaytarish',
      content: <Input placeholder="Sababni kiriting" onChange={(event) => { reason = event.target.value; }} />,
      okText: 'Tasdiqlash',
      cancelText: 'Yopish',
      onOk: async () => {
        if (!reason.trim()) throw new Error('Sabab kiritilishi kerak');
        await reversePayment({ paymentId, studentId: financeStudent.id, reason }).unwrap();
        message.success('To‘lov bekor qilindi va balans yangilandi');
      },
    });
  }

  async function handlePauseSubmit(values: PauseFormValues) {
    if (!financeStudent) return;

    try {
      await createStudentPause({
        studentId: financeStudent.id,
        body: {
          startDate: values.startDate.toISOString(),
          endDate: null,
          reason: values.reason || '',
          status: 'active',
        },
      }).unwrap();
      pauseForm.resetFields();
      message.success('Pauza saqlandi');
    } catch (error) {
      message.error(getErrorMessage(error, "Pauzani saqlab bo'lmadi"));
    }
  }

  async function handleActivatePausedStudent() {
    if (!financeStudent) return;

    try {
      await activatePausedStudent(financeStudent.id).unwrap();
      message.success("O'quvchi aktiv holatga qaytarildi");
    } catch (error) {
      message.error(getErrorMessage(error, "O'quvchini aktiv qilib bo'lmadi"));
    }
  }

  function confirmDelete(student: Student) {
    Modal.confirm({
      title: "O'quvchini o'chirish",
      content: `${student.fullName} ma'lumotlari o'chiriladi. Davom etasizmi?`,
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isDeleting },
      async onOk() {
        try {
          await deleteStudent(student.id).unwrap();
          message.success("O'quvchi o'chirildi");
        } catch (error) {
          message.error(getErrorMessage(error, "O'quvchini o'chirib bo'lmadi"));
        }
      },
    });
  }

  function confirmLeaveStudent(student: Student) {
    let reason = "O'qishni to'xtatdi";
    Modal.confirm({
      title: "O'quvchini guruhdan chiqarish",
      content: (
        <Input
          defaultValue={reason}
          placeholder="Sababni kiriting"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: 'Guruhdan chiqarish',
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isLeavingStudent },
      async onOk() {
        try {
          await leaveStudent({ studentId: student.id, reason }).unwrap();
          message.success("O'quvchi guruhdan chiqarildi va tarix saqlandi");
        } catch (error) {
          message.error(getErrorMessage(error, "O'quvchini guruhdan chiqarib bo'lmadi"));
        }
      },
    });
  }

  function changeStudentView(view: string) {
    setStudentView(view as 'current' | 'history');
    setFilters({});
    setPage(1);
    setMobileFiltersOpen(false);
  }

  function renderStudentActionMenu(record: Student) {
    if (studentView === 'history') {
      return [
        {
          key: 'history',
          label: "O'qish tarixi",
          icon: <Info size={16} />,
          onClick: () => setHistoryStudent(record),
        },
      ];
    }

    return [
      {
        key: 'edit',
        label: 'Tahrirlash',
        icon: <Edit3 size={16} />,
        onClick: () => openEditDrawer(record),
      },
      {
        key: 'finance',
        label: 'Kurslar va pauzalar',
        icon: <PauseCircle size={16} />,
        onClick: () => openFinanceModal(record),
      },
      {
        key: 'move',
        label: 'Guruhini almashtirish',
        icon: <ArrowRightLeft size={16} />,
        onClick: () => openMoveGroupModal(record),
      },
      {
        key: 'leave',
        label: 'Guruhdan chiqarish',
        icon: <UserMinus size={16} />,
        danger: true,
        onClick: () => confirmLeaveStudent(record),
      },
      {
        key: 'delete',
        label: "O'chirish",
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => confirmDelete(record),
      },
    ];
  }

  function renderStudentActionButton(record: Student) {
    const items = renderStudentActionMenu(record);

    if (showActionMenu) {
      const menuItems = items.map(({ key, label, icon, danger }) => ({ key, label, icon, danger }));

      return (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              items.find((item) => item.key === key)?.onClick();
            },
          }}
        >
          <Button className="student-actions-more-button" type="text" icon={<EllipsisVertical size={18} />} aria-label="Amallar" />
        </Dropdown>
      );
    }

    if (studentView === 'history') {
      return (
        <Tooltip title="O'qish tarixi">
          <Button className="action-info-button" size="small" icon={<Info size={17} />} onClick={() => setHistoryStudent(record)} />
        </Tooltip>
      );
    }

    return (
      <Space>
        <Tooltip title="Tahrirlash">
          <Button className="action-edit-button" size="small" icon={<Edit3 size={17} />} onClick={() => openEditDrawer(record)} />
        </Tooltip>
        <Tooltip title="Kurslar va pauzalar">
          <Button className="action-finance-button" size="small" icon={<PauseCircle size={17} />} onClick={() => openFinanceModal(record)} />
        </Tooltip>
        <Tooltip title="Guruhini almashtirish">
          <Button className="action-history-button" size="small" icon={<ArrowRightLeft size={17} />} onClick={() => openMoveGroupModal(record)} />
        </Tooltip>
        <Tooltip title="Guruhdan chiqarish">
          <Button className="action-delete-button" size="small" danger icon={<UserMinus size={17} />} onClick={() => confirmLeaveStudent(record)} />
        </Tooltip>
        <Button size="small" danger icon={<Trash2 size={17} />} onClick={() => confirmDelete(record)} />
      </Space>
    );
  }

  function renderStudentCardActions(record: Student) {
    if (studentView === 'history') {
      return (
        <Tooltip title="O'qish tarixi">
          <Button className="action-info-button" size="small" icon={<Info size={17} />} onClick={() => setHistoryStudent(record)} />
        </Tooltip>
      );
    }

    return (
      <Space wrap className="students-mobile-action-buttons">
        <Tooltip title="Tahrirlash">
          <Button className="action-edit-button" size="small" icon={<Edit3 size={17} />} onClick={() => openEditDrawer(record)} />
        </Tooltip>
        <Tooltip title="Kurslar va pauzalar">
          <Button className="action-finance-button" size="small" icon={<PauseCircle size={17} />} onClick={() => openFinanceModal(record)} />
        </Tooltip>
        <Tooltip title="Guruhini almashtirish">
          <Button className="action-history-button" size="small" icon={<ArrowRightLeft size={17} />} onClick={() => openMoveGroupModal(record)} />
        </Tooltip>
        <Tooltip title="Guruhdan chiqarish">
          <Button className="action-delete-button" size="small" danger icon={<UserMinus size={17} />} onClick={() => confirmLeaveStudent(record)} />
        </Tooltip>
        <Button size="small" danger icon={<Trash2 size={17} />} onClick={() => confirmDelete(record)} />
      </Space>
    );
  }

  return (
    <section className="page students-page">
      {isError ? <Alert className="page-alert" type="error" message="O'quvchilar ma'lumotini yuklab bo'lmadi." showIcon /> : null}

      <Tabs
        activeKey={studentView}
        onChange={changeStudentView}
        items={[
          { key: 'current', label: "Faol o'quvchilar" },
          { key: 'history', label: "O'quvchilar tarixi" },
        ]}
      />

      <div className={`filter-bar ${studentView === 'history' ? 'student-history-filter-bar' : 'students-filter-bar'}`}>
        <Input
          allowClear
          prefix={<Search size={16} />}
          placeholder={studentView === 'history' ? "F.I.Sh, telefon, fan yoki guruh bo'yicha qidirish" : "F.I.Sh yoki telefon bo'yicha qidirish"}
          value={filters.search}
          onChange={(event) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, search: event.target.value }));
          }}
        />
        <Button
          className="students-filter-toggle"
          icon={<SlidersHorizontal size={16} />}
          aria-label="Filtr"
          onClick={toggleMobileFilters}
        />
        <div className={`students-filter-extra ${mobileFiltersOpen ? 'is-open' : ''}`}>
          {studentView === 'current' ? (
            <>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Guruh"
                loading={isGroupsFetching}
                options={filterGroupOptions}
                value={filters.groupId}
                onChange={(groupId) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, groupId }));
                }}
              />
              <Select
                allowClear
                placeholder="Holat"
                options={statusOptions.filter((option) => option.value === 'active' || option.value === 'paused')}
                value={filters.status}
                onChange={(status) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, status }));
                }}
              />
              <Select
                allowClear
                placeholder="To'lov"
                options={paymentStatusOptions}
                value={filters.paymentStatus}
                onChange={(paymentStatus) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, paymentStatus }));
                }}
              />
            </>
          ) : null}
          <Button icon={<X size={16} />} onClick={clearFilters}>
            Tozalash
          </Button>
          {studentView === 'current' ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDrawer}>
              O'quvchi qo'shish
            </Button>
          ) : null}
        </div>
      </div>

      <Table
        className="students-table"
        rowKey="id"
        size="small"
        tableLayout="auto"
        loading={isFetching}
        dataSource={students}
        pagination={{
          current: pagination?.page || page,
          pageSize: pagination?.limit || limit,
          total: pagination?.total || 0,
          showSizeChanger: false,
          onChange: (nextPage) => setPage(nextPage),
        }}
        columns={[
          { title: 'F.I.Sh', dataIndex: 'fullName' },
          {
            title: 'Telefon',
            dataIndex: 'phone',
            render: (_value, record: Student) => <PhoneCell student={record} />,
          },
          {
            title: 'Guruh',
            dataIndex: 'group',
            render: (_value, record: Student) => record.group?.name || '-',
          },
          ...(studentView === 'history'
            ? [
                {
                  title: 'Fan',
                  dataIndex: 'subject',
                  render: (_value: unknown, record: Student) =>
                    record.enrollmentHistory.map((item) => item.subject).filter((value, index, values) => values.indexOf(value) === index).join(', ') || '-',
                },
                {
                  title: "O'qigan davri",
                  dataIndex: 'studyPeriod',
                  render: (_value: unknown, record: Student) => {
                    const latest = record.enrollmentHistory[record.enrollmentHistory.length - 1];
                    return latest ? `${formatStudyDate(latest.startedAt)} - ${formatStudyDate(latest.endedAt)}` : '-';
                  },
                },
              ]
            : [
                {
                  title: "O'qituvchi",
                  dataIndex: 'teacher',
                  render: (_value: unknown, record: Student) => record.teacher?.fullName || '-',
                },
              ]),
          {
            title: "To'lov",
            dataIndex: 'paymentStatus',
            render: (status) => <PaymentStatusTag status={status} />,
          },
          {
            title: 'Holat',
            dataIndex: 'status',
            render: (status) => <StudentStatusTag status={status} />,
          },
          {
            title: 'Amallar',
            render: (_value, record) => renderStudentActionButton(record),
          },
        ]}
      />

      <div className="students-mobile-list">
        {students.map((student) => {
          const currentGroup = student.group;
          const latestEnrollment = student.enrollmentHistory[student.enrollmentHistory.length - 1];

          return (
            <article className="students-mobile-card" key={student.id}>
              <div className="students-mobile-card-header">
                <div className="stacked-cell">
                  <span>{student.fullName}</span>
                  <small>{formatUzPhoneDisplay(student.phone)}</small>
                </div>
                <div className="students-mobile-status">
                  <StudentStatusTag status={student.status} />
                  <PaymentStatusTag status={student.paymentStatus} />
                </div>
              </div>

              <div className="students-mobile-details">
                <div>
                  <span>Guruh</span>
                  <strong>{currentGroup?.name || '-'}</strong>
                </div>
                {studentView === 'current' ? (
                  <div>
                    <span>O'qituvchi</span>
                    <strong>{currentGroup?.teacher?.fullName || '-'}</strong>
                  </div>
                ) : (
                  <div>
                    <span>O'qigan davri</span>
                    <strong>
                      {latestEnrollment ? `${formatStudyDate(latestEnrollment.startedAt)} - ${formatStudyDate(latestEnrollment.endedAt)}` : '-'}
                    </strong>
                  </div>
                )}
                <div>
                  <span>Telefon</span>
                  <strong>{formatUzPhoneDisplay(student.phone)}</strong>
                </div>
                {student.secondaryPhone ? (
                  <div>
                    <span>Qo'shimcha</span>
                    <strong>{formatUzPhoneDisplay(student.secondaryPhone)}</strong>
                  </div>
                ) : null}
              </div>

              <div className="students-mobile-actions-row">
                <div className="students-mobile-actions">
                  {isMobileView ? renderStudentCardActions(student) : renderStudentActionButton(student)}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        title={historyStudent ? `${historyStudent.fullName} - o'qish tarixi` : "O'qish tarixi"}
        open={Boolean(historyStudent)}
        onCancel={() => setHistoryStudent(null)}
        footer={null}
        width={760}
      >
        <Table
          rowKey={(record) => `${record.groupId}-${record.startedAt}`}
          size="small"
          pagination={false}
          dataSource={historyStudent?.enrollmentHistory || []}
          columns={[
            { title: 'Fan', dataIndex: 'subject' },
            { title: 'Guruh', dataIndex: 'groupName' },
            { title: 'Boshlagan', dataIndex: 'startedAt', render: formatStudyDate },
            { title: 'Tugatgan', dataIndex: 'endedAt', render: formatStudyDate },
            { title: 'Sabab', dataIndex: 'endReason', render: (value) => value || '-' },
          ]}
        />
      </Modal>

      <Drawer
        title={editingStudent ? "O'quvchini tahrirlash" : "O'quvchi qo'shish"}
        width="min(620px, 100vw)"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={defaultValues} onFinish={handleSubmit}>
          {editingStudent ? (
            <div className="finance-summary compact-summary">
              <div>
                <span>Umumiy qarz</span>
                <strong className={editFinanceData?.summary.totalDebt ? 'danger-text' : 'success-text'}>
                  {formatMoney(editFinanceData?.summary.totalDebt)}
                </strong>
              </div>
              <div>
                <span>Oldindan to'lov</span>
                <strong>{formatMoney(editFinanceData?.summary.advanceBalance)}</strong>
              </div>
            </div>
          ) : null}

          <Form.Item
            name="fullName"
            label="F.I.Sh"
            rules={[
              { required: true, message: "F.I.Sh kiriting" },
              { min: 3, message: 'Kamida 3 ta belgi kiriting' },
            ]}
          >
            <Input placeholder="Masalan: Sardor Valiyev" />
          </Form.Item>

          <div className={showSecondaryPhone ? 'form-grid' : 'student-phone-row'}>
            <Form.Item
              name="phone"
              label="Telefon"
              rules={[
                { required: true, message: 'Telefon raqam kiriting' },
                {
                  pattern: /^\+998\d{9}$/,
                  message: "Telefon raqam noto'g'ri kiritilgan",
                },
              ]}
            >
              <Input placeholder="+998 90 123 45 67" maxLength={13} />
            </Form.Item>
            {showSecondaryPhone ? (
              <Form.Item
                name="secondaryPhone"
                label="Ikkinchi telefon"
                rules={[
                  {
                    pattern: /^$|^\+998\d{9}$/,
                    message: "Telefon raqam noto'g'ri kiritilgan",
                  },
                ]}
              >
                <Input
                  placeholder="+998 91 222 33 44"
                  maxLength={13}
                  suffix={
                    <Tooltip title="Ikkinchi telefonni olib tashlash">
                      <Button
                        className="input-suffix-button"
                        type="text"
                        icon={<X size={15} />}
                        onClick={() => {
                          form.setFieldValue('secondaryPhone', '');
                          setShowSecondaryPhone(false);
                        }}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            ) : (
              <Form.Item className="secondary-phone-action">
                <Tooltip title="Ikkinchi telefon qo'shish">
                  <Button icon={<Plus size={17} />} onClick={() => setShowSecondaryPhone(true)} />
                </Tooltip>
              </Form.Item>
            )}
          </div>

          {!editingStudent ? (
            <>
              <Form.Item
                name="firstMonthBilling"
                label="O‘quvchi turi va birinchi oy hisobi"
                rules={[{ required: true, message: 'O‘quvchi turini tanlang' }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="prorated">
                      Yangi o‘quvchi — qo‘shilgan sanadan oy oxirigacha
                    </Radio>
                    <Radio value="full">
                      Oldindan o‘qiyotgan — oyning 1-sanasidan to‘liq oy
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <div className="admission-subject-row">
                <Form.Item name="subject" label="Fan" rules={[{ required: true, message: 'Fan tanlang' }]}>
                  <Select options={subjectOptions} onChange={() => form.setFieldValue('groupId', '')} placeholder="Fan tanlang" />
                </Form.Item>

                <Form.Item className="closed-groups-toggle">
                  <Space>
                    <Switch
                      checked={showClosedGroups}
                      onChange={(checked) => {
                        setShowClosedGroups(checked);
                        form.setFieldValue('allowClosedGroup', checked);

                        if (!checked && selectedGroup && !selectedGroup.isEnrollmentOpen) {
                          form.setFieldValue('groupId', '');
                        }
                      }}
                    />
                    <span>Yopiq guruhlarni ham ko'rsatish</span>
                  </Space>
                </Form.Item>
              </div>

              <Form.Item name="groupId" label="Guruh" rules={[{ required: true, message: 'Guruh tanlang' }]}>
                <Select
                  showSearch
                  optionFilterProp="title"
                  loading={isGroupsFetching}
                  options={groupOptions}
                  optionLabelProp="title"
                  placeholder="Tanlangan fan bo'yicha guruh tanlang"
                  notFoundContent="Bu fan bo'yicha mos guruh yo'q"
                />
              </Form.Item>

              {formatGroupInfo(selectedGroup)}

              {selectedGroup && !selectedGroup.isEnrollmentOpen ? (
                <Alert
                  className="page-alert"
                  type="warning"
                  message="Bu guruhda qabul yopiq. Faqat darajasi mos o'quvchi uchun istisno tarzida qo'shing."
                  showIcon
                />
              ) : null}
            </>
          ) : null}

          <div className="form-grid">
            <Form.Item name="parentName" label="Ota-ona F.I.Sh">
              <Input placeholder="Masalan: Vali Valiyev" />
            </Form.Item>
            <Form.Item
              name="parentPhone"
              label="Ota-ona telefoni"
              rules={[
                {
                  pattern: /^$|^\+998\d{9}$/,
                  message: "Telefon raqam noto'g'ri kiritilgan",
                },
              ]}
            >
              <Input placeholder="+998 91 222 33 44" maxLength={13} />
            </Form.Item>
          </div>

          <Form.Item name="source" label="Manba" rules={[{ required: true, message: 'Manba tanlang' }]}>
            <Select options={sourceOptions} placeholder="Bizni qayerdan topdi?" />
          </Form.Item>

          <Form.Item name="note" label="Izoh">
            <TextArea rows={4} placeholder="O'quvchi haqida qo'shimcha ma'lumot" maxLength={500} showCount />
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
        title={movingStudent ? `${movingStudent.fullName} - guruhini almashtirish` : "Guruhini almashtirish"}
        open={Boolean(movingStudent)}
        onCancel={closeMoveGroupModal}
        onOk={() => moveGroupForm.submit()}
        okText="Saqlash"
        cancelText="Bekor qilish"
        confirmLoading={isUpdating}
        width={640}
      >
        <Form form={moveGroupForm} layout="vertical" onFinish={handleMoveGroup}>
          <div className="admission-subject-row">
            <Form.Item name="subject" label="Fan" rules={[{ required: true, message: 'Fan tanlang' }]}>
              <Select options={subjectOptions} onChange={() => moveGroupForm.setFieldValue('groupId', '')} placeholder="Fan tanlang" />
            </Form.Item>

            <Form.Item className="closed-groups-toggle">
              <Space>
                <Switch
                  checked={showClosedMoveGroups}
                  onChange={(checked) => {
                    setShowClosedMoveGroups(checked);

                    if (!checked && selectedMoveGroup && !selectedMoveGroup.isEnrollmentOpen) {
                      moveGroupForm.setFieldValue('groupId', '');
                    }
                  }}
                />
                <span>Yopiq guruhlarni ham ko'rsatish</span>
              </Space>
            </Form.Item>
          </div>

          <Form.Item name="groupId" label="Guruh" rules={[{ required: true, message: 'Guruh tanlang' }]}>
            <Select
              showSearch
              optionFilterProp="title"
              loading={isGroupsFetching}
              options={moveGroupOptions}
              optionLabelProp="title"
              placeholder="Tanlangan fan bo'yicha guruh tanlang"
              notFoundContent="Bu fan bo'yicha mos guruh yo'q"
            />
          </Form.Item>

          {formatGroupInfo(selectedMoveGroup)}

          {selectedMoveGroup && !selectedMoveGroup.isEnrollmentOpen ? (
            <Alert
              className="page-alert"
              type="warning"
              message="Bu guruhda qabul yopiq. Faqat darajasi mos o'quvchi uchun istisno tarzida ko'chiring."
              showIcon
            />
          ) : null}
        </Form>
      </Modal>

      <Modal
        className="student-finance-modal"
        title={financeStudent ? `${financeStudent.fullName} - kurslar va pauzalar` : "Kurslar va pauzalar"}
        open={Boolean(financeStudent)}
        onCancel={closeFinanceModal}
        footer={null}
        width={980}
      >
        {financeStudent?.status === 'paused' ? (
          <Alert
            className="page-alert"
            type="warning"
            message="O'quvchi pauzada. Aktiv qilish bosilganda pauza bugungi sana bilan yopiladi va hisob davom etadi."
            action={
              <Button size="small" loading={isActivatingPausedStudent} onClick={handleActivatePausedStudent}>
                Aktiv qilish
              </Button>
            }
            showIcon
          />
        ) : null}

        <Tabs
          items={[
            {
              key: 'balances',
              label: "Oylar bo'yicha qarz",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={isFinanceFetching}
                  dataSource={financeData?.balances || []}
                  pagination={false}
                  scroll={{ x: 900 }}
                  columns={[
                    { title: 'Oy', dataIndex: 'month', width: 100 },
                    { title: 'Guruh', dataIndex: 'groupId', render: (groupId) => financeData?.enrollments.find((item) => item.groupId === groupId)?.groupName || '-' },
                    {
                      title: 'Oylik narx',
                      dataIndex: 'monthlyPriceSnapshot',
                      render: (value) => formatMoney(value),
                    },
                    {
                      title: 'Pauza chegirma',
                      dataIndex: 'pauseDiscountAmount',
                      render: (value) => formatMoney(value),
                    },
                    { title: 'Kurs chegirmasi', dataIndex: 'courseDiscountAmount', render: (value) => formatMoney(value) },
                    {
                      title: 'Hisoblangan',
                      dataIndex: 'chargedAmount',
                      render: (value) => formatMoney(value),
                    },
                    {
                      title: "To'langan",
                      dataIndex: 'paidAmount',
                      render: (value) => formatMoney(value),
                    },
                    {
                      title: 'Qarz',
                      dataIndex: 'debtAmount',
                      render: (value) => <span className={value > 0 ? 'danger-text' : 'success-text'}>{formatMoney(value)}</span>,
                    },
                    {
                      title: 'Holat',
                      dataIndex: 'status',
                      render: (status) => (status === 'paid' || status === 'overpaid' ? <Tag color="green">Yopilgan</Tag> : <Tag color="red">Qarz</Tag>),
                    },
                    {
                      title: "To'lov",
                      width: 110,
                      fixed: 'right',
                      render: (_value, record: StudentMonthlyBalance) => (
                        <Button
                          size="small"
                          type="primary"
                          disabled={record.debtAmount <= 0}
                          icon={<CircleDollarSign size={15} />}
                          onClick={() => openBalancePaymentModal(record)}
                        >
                          To'lash
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'payments',
              label: "To'lov tarixi",
              children: (
                <>
                  <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} className="finance-inline-form">
                    <Form.Item
                      className="payment-method-form-item"
                      name="method"
                      label="To'lov turi"
                      rules={[{ required: true, message: "To'lov usulini tanlang" }]}
                    >
                      <PaymentMethodSelector />
                    </Form.Item>
                    <Form.Item
                      name="amount"
                      label="Summa"
                      rules={[{ required: true, message: "To'lov summasini kiriting" }]}
                    >
                      <InputNumber
                        min={1}
                        className="full-width"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                        parser={(value) => Number(value?.replace(/\s/g, '') || 0)}
                        placeholder="500 000"
                      />
                    </Form.Item>
                    <Form.Item name="note" label="Izoh">
                      <Input placeholder="Izoh" />
                    </Form.Item>
                    <Form.Item className="finance-submit-item">
                      <Button type="primary" htmlType="submit" loading={isPaymentSaving} icon={<CircleDollarSign size={16} />}>
                        To'lov qo'shish
                      </Button>
                    </Form.Item>
                  </Form>

                  <Table
                    rowKey="id"
                    size="small"
                    loading={isFinanceFetching}
                    dataSource={financeData?.payments || []}
                    pagination={false}
                    scroll={{ x: 760 }}
                    columns={[
                      { title: 'Sana', dataIndex: 'paidAt', render: (value) => dayjs(value).format('DD.MM.YYYY') },
                      { title: 'Summa', dataIndex: 'amount', render: (value) => formatMoney(value) },
                      { title: 'Usul', dataIndex: 'method', render: (value: PaymentMethod) => getPaymentMethodLabel(value) },
                      { title: 'Oldindan', dataIndex: 'advanceAmount', render: (value) => formatMoney(value) },
                      {
                        title: 'Oylar',
                        dataIndex: 'allocations',
                        render: (allocations: { month: string; amount: number }[]) =>
                          allocations.length ? allocations.map((item) => `${item.month}: ${formatMoney(item.amount)}`).join(', ') : '-',
                      },
                      { title: 'Izoh', dataIndex: 'note', render: (value) => value || '-' },
                      { title: 'Holat', dataIndex: 'status', render: (value) => <Tag color={value === 'active' ? 'green' : 'red'}>{value === 'active' ? 'Faol' : value === 'refunded' ? 'Qaytarilgan' : 'Bekor qilingan'}</Tag> },
                      {
                        title: 'Amal',
                        render: (_value, record) => user?.role === 'owner' && record.status === 'active' ? (
                          <Button size="small" danger onClick={() => confirmReversePayment(record.id)}>Bekor qilish</Button>
                        ) : null,
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'courses',
              label: 'Kurslar va chegirmalar',
              children: (
                <>
                  <Form form={enrollmentForm} layout="vertical" onFinish={handleEnrollmentSubmit} initialValues={{ discountType: 'none', discountValue: 0 }} className="enrollment-form-modern">
                    <div className="enrollment-section">
                      <h4 className="enrollment-section-title">Yangi guruhga olish</h4>
                      <Form.Item 
                        name="groupId" 
                        label="Guruhni tanlang" 
                        rules={[{ required: true, message: 'Guruhni tanlang' }]}
                        className="enrollment-form-item"
                      >
                        <Select 
                          placeholder="Guruh va fan bo'yicha qidiring..."
                          options={activeGroups.filter((group) => !financeData?.enrollments.some((item) => item.groupId === group.id && item.status === 'active')).map((group) => ({ label: `${group.name} — ${group.subject}`, value: group.id }))} 
                        />
                      </Form.Item>
                    </div>

                    <div className="enrollment-section">
                      <h4 className="enrollment-section-title">Chegirma (ixtiyoriy)</h4>
                      <Form.Item 
                        name="discountType" 
                        label="Chegirma turi"
                        className="enrollment-form-item"
                      >
                        <Select 
                          options={[{ label: 'Chegirmasiz', value: 'none' }, { label: 'Foiz (%)', value: 'percentage' }, { label: "Belgilangan summa (so'm)", value: 'fixed' }]} 
                        />
                      </Form.Item>
                      <Form.Item 
                        name="discountValue" 
                        label="Chegirma qiymati"
                        className="enrollment-form-item"
                      >
                        <InputNumber min={0} className="full-width" placeholder="0" />
                      </Form.Item>
                      <Form.Item 
                        name="discountReason" 
                        label="Chegirma sababi"
                        className="enrollment-form-item"
                      >
                        <Input placeholder="Masalan: sport olimpiadasi, yangi o'quvchi, va h.k." />
                      </Form.Item>
                    </div>

                    <Form.Item className="enrollment-submit-wrapper">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={isEnrollmentSaving}
                        size="large"
                        block
                      >
                        Kursga yozish
                      </Button>
                    </Form.Item>
                  </Form>
                  <Table className="student-finance-courses-table" rowKey="id" size="small" dataSource={financeData?.enrollments || []} pagination={false} columns={[
                    { title: 'Guruh', dataIndex: 'groupName' }, { title: 'Yo‘nalish', dataIndex: 'subject' },
                    { title: 'Boshlangan', dataIndex: 'startedAt', render: (value) => dayjs(value).format('DD.MM.YYYY') },
                    { title: 'Birinchi oy', dataIndex: 'firstMonthBilling', render: (value) => value === 'prorated' ? 'Qo‘shilgan sanadan' : 'To‘liq oy' },
                    { title: 'Chegirma', render: (_value, record) => record.discountType === 'none' ? '-' : `${record.discountValue}${record.discountType === 'percentage' ? '%' : " so'm"}` },
                    { title: 'Sabab', dataIndex: 'discountReason', render: (value) => value || '-' },
                    { title: 'Holat', dataIndex: 'status', render: (value) => <Tag color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? 'Faol' : 'Yakunlangan'}</Tag> },
                    { title: 'Amal', render: (_value, record) => record.status === 'active' ? <Space wrap><Button size="small" onClick={() => editFirstMonthBilling(record)}>Birinchi oy</Button><Button size="small" onClick={() => editEnrollmentDiscount(record)}>Chegirma</Button><Button size="small" danger onClick={() => finishEnrollment(record.id)}>Yakunlash</Button></Space> : null },
                  ]} />
                  <div className="student-finance-courses-mobile-list">
                    {(financeData?.enrollments || []).map((record) => (
                      <article className="student-finance-mobile-card" key={record.id}>
                        <div className="student-finance-mobile-heading">
                          <div>
                            <strong>{record.groupName}</strong>
                            <span>{record.subject}</span>
                          </div>
                          <Tag color={record.status === 'active' ? 'green' : 'default'}>{record.status === 'active' ? 'Faol' : 'Yakunlangan'}</Tag>
                        </div>
                        <div className="student-finance-mobile-details">
                          <span>Boshlangan</span><strong>{dayjs(record.startedAt).format('DD.MM.YYYY')}</strong>
                          <span>Birinchi oy</span><strong>{record.firstMonthBilling === 'prorated' ? 'Qo‘shilgan sanadan' : 'To‘liq oy'}</strong>
                          <span>Chegirma</span><strong>{record.discountType === 'none' ? '-' : `${record.discountValue}${record.discountType === 'percentage' ? '%' : " so'm"}`}</strong>
                          <span>Sabab</span><strong>{record.discountReason || '-'}</strong>
                        </div>
                        {record.status === 'active' ? (
                          <div className="student-finance-mobile-actions">
                            <Button size="small" onClick={() => editFirstMonthBilling(record)}>Birinchi oy</Button>
                            <Button size="small" onClick={() => editEnrollmentDiscount(record)}>Chegirma</Button>
                            <Button size="small" danger onClick={() => finishEnrollment(record.id)}>Yakunlash</Button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </>
              ),
            },
            {
              key: 'pauses',
              label: 'Pauzalar',
              children: (
                <>
                  <Form form={pauseForm} layout="vertical" onFinish={handlePauseSubmit} className="finance-inline-form">
                    <Form.Item
                      name="startDate"
                      label="Boshlanish"
                      rules={[{ required: true, message: 'Boshlanish sanasini tanlang' }]}
                    >
                      <DatePicker className="full-width" />
                    </Form.Item>
                    <Form.Item name="reason" label="Sabab">
                      <Input placeholder="Masalan: oilaviy sabab" />
                    </Form.Item>
                    <Form.Item className="finance-submit-item">
                      <Button htmlType="submit" loading={isPauseSaving} icon={<PauseCircle size={16} />}>
                        Pauza qo'shish
                      </Button>
                    </Form.Item>
                  </Form>

                  <Table
                    className="student-finance-pauses-table"
                    rowKey="id"
                    size="small"
                    loading={isFinanceFetching}
                    dataSource={financeData?.pauses || []}
                    pagination={false}
                    columns={[
                      { title: 'Boshlanish', dataIndex: 'startDate', render: (value) => dayjs(value).format('DD.MM.YYYY') },
                      { title: 'Tugash', dataIndex: 'endDate', render: (value) => (value ? dayjs(value).format('DD.MM.YYYY') : '-') },
                      { title: 'Holat', dataIndex: 'status', render: (value) => (value === 'active' ? <Tag color="orange">Pauzada</Tag> : <Tag>Yopilgan</Tag>) },
                      { title: 'Sabab', dataIndex: 'reason', render: (value) => value || '-' },
                    ]}
                  />
                  <div className="student-finance-pauses-mobile-list">
                    {(financeData?.pauses || []).map((record) => (
                      <article className="student-finance-mobile-card" key={record.id}>
                        <div className="student-finance-mobile-heading">
                          <div>
                            <strong>Pauza</strong>
                            <span>{record.reason || 'Sabab ko‘rsatilmagan'}</span>
                          </div>
                          {record.status === 'active' ? <Tag color="orange">Pauzada</Tag> : <Tag>Yopilgan</Tag>}
                        </div>
                        <div className="student-finance-mobile-details">
                          <span>Boshlanish</span><strong>{dayjs(record.startDate).format('DD.MM.YYYY')}</strong>
                          <span>Tugash</span><strong>{record.endDate ? dayjs(record.endDate).format('DD.MM.YYYY') : '-'}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ),
            },
          ].filter((item) => item.key === 'courses' || item.key === 'pauses')}
        />
      </Modal>

      <Modal
        title="To'lovni tasdiqlash"
        open={Boolean(selectedPaymentBalance)}
        onCancel={() => setSelectedPaymentBalance(null)}
        onOk={confirmBalancePayment}
        okText="Tasdiqlash"
        cancelText="Bekor qilish"
        confirmLoading={isPaymentSaving}
        width={420}
      >
        {selectedPaymentBalance ? (
          <div className="payment-confirm-box">
            <div>
              <span>O'quvchi</span>
              <strong>{financeStudent?.fullName}</strong>
            </div>
            <div>
              <span>Oy</span>
              <strong>{selectedPaymentBalance.month}</strong>
            </div>
            <div>
              <span>Summa</span>
              <strong>{formatMoney(selectedPaymentBalance.debtAmount)}</strong>
            </div>
            <div>
              <span>To'lov usuli</span>
              <PaymentMethodSelector
                value={selectedPaymentMethod}
                onChange={setSelectedPaymentMethod}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="To'lov cheki"
        open={Boolean(receipt)}
        onCancel={() => setReceipt(null)}
        footer={[
          <Button key="close" onClick={() => setReceipt(null)}>
            Yopish
          </Button>,
          <Button key="print" type="primary" icon={<Printer size={16} />} onClick={printReceipt}>
            Chop etish
          </Button>,
        ]}
        width={420}
      >
        {receipt ? (
          <div className="receipt-print-area">
            <div className="receipt-paper">
              <BrandIdentity brand={branding?.unify || UNIFY_BRAND} variant="receipt" />
              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>Chek</span>
                <strong>#{receipt.payment.id.slice(-8).toUpperCase()}</strong>
              </div>
              <div className="receipt-row">
                <span>Sana</span>
                <strong>{dayjs(receipt.payment.paidAt).format('DD.MM.YYYY HH:mm')}</strong>
              </div>
              <div className="receipt-row">
                <span>O'quvchi</span>
                <strong>{receipt.student.fullName}</strong>
              </div>
              {receipt.monthLabel || receipt.payment.allocations.length ? (
                <div className="receipt-row">
                  <span>Oy</span>
                  <strong>{receipt.monthLabel || receipt.payment.allocations.map((item) => item.month).join(', ')}</strong>
                </div>
              ) : null}
              <div className="receipt-row">
                <span>Usul</span>
                <strong>{getPaymentMethodLabel(receipt.payment.method)}</strong>
              </div>
              <div className="receipt-divider" />
              <div className="receipt-row receipt-total">
                <span>To'landi</span>
                <strong>{formatMoney(receipt.payment.amount)}</strong>
              </div>
              <div className="receipt-divider" />
              <p className="receipt-footer">{(branding?.unify.receiptFooter || UNIFY_BRAND.receiptFooter) ?? "To'lovingiz uchun rahmat"}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
