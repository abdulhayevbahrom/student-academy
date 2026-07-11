import { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  CircleDollarSign,
  Download,
  Edit3,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import {
  Debtor,
  PaymentMethod,
  useCreatePaymentMutation,
  useGetDebtorsQuery,
  useGetEskizSmsReportQuery,
  useGetPaymentsDashboardQuery,
  useGetFinancialReportQuery,
  Payment,
  PaymentHistoryItem,
  Student,
  useGetStudentsQuery,
  useGetStudentFinanceQuery,
  useGetPaymentsHistoryQuery,
  useGetBrandingSettingsQuery,
  useSendDebtorSmsRemindersMutation,
  useReversePaymentMutation,
  useUpdatePaymentMutation,
  useLazyExportFinancialReportQuery,
} from "../../services/api";

type MobileCellAttributes = React.TdHTMLAttributes<HTMLTableCellElement> & { "data-label": string };

function mobileCellLabel(label: string): MobileCellAttributes {
  // `data-label` is consumed by the mobile table CSS. The computed key keeps
  // the custom data attribute while satisfying the stricter Ant Design typing.
  return { "aria-label": label, "data-label": label };
}
import PaymentMethodSelector from "../../components/PaymentMethodSelector";
import BrandIdentity from "../../components/BrandIdentity";
import { UNIFY_BRAND } from "../../config/branding";
import { useAuth } from "../../auth/AuthContext";
import { formatUzPhoneDisplay } from "../../utils/phone";

type MultiMonthPaymentFormValues = {
  amount: number;
  note?: string;
};

type StudentPaymentFormValues = {
  amount: number;
  method: PaymentMethod;
  isAdvance?: boolean;
  note?: string;
};

type PaymentReceipt = {
  payment: Payment;
  studentName: string;
  subject?: string;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Naqd",
  bank_transfer: "Bank o'tkazma",
  click: "Click",
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  cash: "#e83f63",
  bank_transfer: "#20c997",
  click: "#f59e0b",
};

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString("uz-UZ")} so'm`;
}

function PaymentMethodChart({
  title,
  total,
  totals,
}: {
  title: string;
  total?: number;
  totals?: Partial<Record<PaymentMethod, number>>;
}) {
  const entries = (Object.entries(totals || {}) as [PaymentMethod, number][])
    .filter(([, amount]) => Number(amount) > 0)
    .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount);
  const totalAmount = Number(total || 0);
  let currentPercentage = 0;
  const gradientParts = entries.map(([method, amount]) => {
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    const start = currentPercentage;
    currentPercentage += percentage;
    return `${paymentMethodColors[method]} ${start}% ${currentPercentage}%`;
  });

  return (
    <div className="payment-method-chart-card">
      <div className="payment-method-chart-heading">
        <span>{title}</span>
        <strong>{formatMoney(totalAmount)}</strong>
      </div>
      <div className="payment-method-chart-content">
        <div
          className={`payment-method-donut ${entries.length ? "" : "is-empty"}`}
          style={
            entries.length
              ? { background: `conic-gradient(${gradientParts.join(", ")})` }
              : undefined
          }
          aria-label={`${title} to'lov usullari diagrammasi`}
        >
          <div>
            <strong>{entries.length}</strong>
            <span>usul</span>
          </div>
        </div>
        <div className="payment-method-chart-legend">
          {entries.length ? (
            entries.map(([method, amount]) => {
              const percentage =
                totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

              return (
                <div key={method} className="payment-method-chart-row">
                  <i style={{ background: paymentMethodColors[method] }} />
                  <span>{paymentMethodLabels[method]}</span>
                  <div className="payment-method-chart-meta">
                    <strong>{percentage.toFixed(1)}%</strong>
                    <small>{formatMoney(amount)}</small>
                  </div>
                </div>
              );
            })
          ) : (
            <span className="muted-text">To'lov mavjud emas</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MethodTotals({
  totals,
}: {
  totals?: Partial<Record<PaymentMethod, number>>;
}) {
  const entries = Object.entries(totals || {}).filter(
    ([, value]) => Number(value) > 0,
  ) as [PaymentMethod, number][];

  if (!entries.length) return <span className="muted-text">To'lov yo'q</span>;

  return (
    <Space wrap>
      {entries.map(([method, amount]) => (
        <Tag key={method} color="blue">
          {paymentMethodLabels[method]}: {formatMoney(amount)}
        </Tag>
      ))}
    </Space>
  );
}

function PhoneCell({ debtor }: { debtor: Debtor }) {
  return (
    <div className="stacked-cell">
      <span>{formatUzPhoneDisplay(debtor.phone)}</span>
      <small>
        {debtor.secondaryPhone
          ? formatUzPhoneDisplay(debtor.secondaryPhone)
          : "-"}
      </small>
    </div>
  );
}

function PaymentAmountMethodCell({
  amount,
  method,
}: {
  amount: number;
  method: PaymentMethod;
}) {
  return (
    <div className="payment-history-amount-method">
      <strong>{formatMoney(amount)}</strong>
      <small>{paymentMethodLabels[method] || method}</small>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [modal, modalContextHolder] = Modal.useModal();
  const [multiMonthPaymentForm] = Form.useForm<MultiMonthPaymentFormValues>();
  const [studentPaymentForm] = Form.useForm<StudentPaymentFormValues>();
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [debtorMonthsModal, setDebtorMonthsModal] = useState<Debtor | null>(
    null,
  );
  const [loadingBalanceId, setLoadingBalanceId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [reportRange, setReportRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [reportPaymentPage, setReportPaymentPage] = useState(1);
  const [reportPaymentMethod, setReportPaymentMethod] = useState<
    PaymentMethod | undefined
  >();
  const [reportPaymentSearch, setReportPaymentSearch] = useState("");
  const [smsDraft, setSmsDraft] = useState("");
  const [smsSearch, setSmsSearch] = useState("");
  const [selectedSmsStudentIds, setSelectedSmsStudentIds] = useState<string[]>(
    [],
  );
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const enteredPaymentAmount =
    Form.useWatch("amount", multiMonthPaymentForm) || 0;
  const { data, isError, isFetching } = useGetPaymentsDashboardQuery();
  const { data: debtorsResponse, isFetching: isDebtorsFetching } =
    useGetDebtorsQuery();
  const [createPayment, { isLoading: isPaymentSaving }] =
    useCreatePaymentMutation();
  const reportParams = {
    dateFrom: reportRange[0].format("YYYY-MM-DD"),
    dateTo: reportRange[1].format("YYYY-MM-DD"),
  };
  const { data: report, isFetching: isReportFetching } =
    useGetFinancialReportQuery(reportParams);
  const { data: studentsResponse, isFetching: isStudentsFetching } =
    useGetStudentsQuery({
      search: studentSearch.trim() || undefined,
      limit: 20,
      view: "current",
    });

  const { data: selectedFinance, isFetching: isSelectedFinanceFetching } =
    useGetStudentFinanceQuery(selectedStudent?.id || "", {
      skip: !selectedStudent,
    });
  const { data: paymentHistory, isFetching: isHistoryFetching } =
    useGetPaymentsHistoryQuery({ page: 1, limit: 100 });
  const { data: branding } = useGetBrandingSettingsQuery();
  const [exportFinancialReport, { isFetching: isExportingReport }] =
    useLazyExportFinancialReportQuery();
  const { data: smsReportResponse, isFetching: isSmsReportFetching } =
    useGetEskizSmsReportQuery({
      year: dayjs().year(),
      month: dayjs().month() + 1,
      is_global: false,
    });
  const smsReportItems = smsReportResponse?.report?.data || [];
  const smsReportStatus = smsReportResponse?.report?.status || "unknown";
  const [sendDebtorSmsReminders, { isLoading: isSendingDebtorSms }] =
    useSendDebtorSmsRemindersMutation();
  const smsDebtors = useMemo(() => {
    const query = smsSearch.trim().toLowerCase();

    if (!query) return debtorsResponse?.data || [];

    return (debtorsResponse?.data || []).filter((debtor) => {
      const haystack = [
        debtor.fullName,
        debtor.phone,
        debtor.secondaryPhone,
        debtor.parentPhone || "",
        debtor.groupName,
        debtor.subject,
        String(debtor.totalDebt || ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [debtorsResponse?.data, smsSearch]);
  const { data: reportPayments, isFetching: isReportPaymentsFetching } =
    useGetPaymentsHistoryQuery({
      ...reportParams,
      page: reportPaymentPage,
      limit: 20,
      method: reportPaymentMethod,
      search: reportPaymentSearch.trim() || undefined,
      status: "active",
    });
  const [reversePayment] = useReversePaymentMutation();
  const [updatePayment] = useUpdatePaymentMutation();

  async function exportReport() {
    try {
      const reportBlob = await exportFinancialReport(reportParams).unwrap();
      const csvText = await reportBlob.text();
      const parsedWorkbook = XLSX.read(csvText, { type: "string" });
      const workbook = XLSX.utils.book_new();

      const summaryRows = [
        ["Hisobot", `${reportParams.dateFrom} - ${reportParams.dateTo}`],
        ["Kirim", formatMoney(report?.income)],
        ["Xarajat", formatMoney(report?.expense)],
        ["Sof natija", formatMoney(report?.net)],
        ["Jami qarz", formatMoney(report?.debt)],
        ["To'lovlar soni", report?.paymentsCount || 0],
        ["Xarajatlar soni", report?.expensesCount || 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Xulosa");

      const sourceSheetName = parsedWorkbook.SheetNames[0];
      if (sourceSheetName) {
        const sourceSheet = parsedWorkbook.Sheets[sourceSheetName];
        XLSX.utils.book_append_sheet(workbook, sourceSheet, "To'lovlar");
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const url = URL.createObjectURL(
        new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `moliyaviy-hisobot-${reportParams.dateFrom}-${reportParams.dateTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Eksportda xatolik",
      );
    }
  }

  async function submitStudentPayment(values: StudentPaymentFormValues) {
    if (!selectedStudent) return;
    try {
      const payment = await createPayment({
        studentId: selectedStudent.id,
        body: { ...values, note: values.note?.trim() || "" },
      }).unwrap();
      setReceipt({
        payment,
        studentName: selectedStudent.fullName,
        subject: selectedStudent.group?.subject,
      });
      studentPaymentForm.resetFields();
      studentPaymentForm.setFieldsValue({ method: "cash", isAdvance: false });
      message.success(
        values.isAdvance ? "Oldindan to‘lov saqlandi" : "To‘lov saqlandi",
      );
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || "To‘lovni saqlab bo‘lmadi");
    }
  }

  function editPayment(record: Payment, studentId = selectedStudent?.id) {
    if (!studentId) return;
    let amount = record.amount;
    let method = record.method;
    let note = record.note;
    modal.confirm({
      title: "To‘lovni tahrirlash",
      className: "payment-edit-confirm",
      content: (
        <div className="payment-edit-form">
          <label>
            <span>Summa</span>
            <InputNumber
              className="full-width"
              min={1}
              defaultValue={amount}
              onChange={(value) => {
                amount = Number(value) || 0;
              }}
            />
          </label>
          <label>
            <span>To‘lov usuli</span>
            <PaymentMethodSelector
              value={method}
              onChange={(value) => {
                method = value;
              }}
            />
          </label>
          <label>
            <span>Izoh</span>
            <Input
              defaultValue={note}
              placeholder="Izoh kiriting"
              onChange={(event) => {
                note = event.target.value;
              }}
            />
          </label>
        </div>
      ),
      okText: "Saqlash",
      cancelText: "Yopish",
      onOk: () =>
        updatePayment({
          paymentId: record.id,
          studentId,
          body: { amount, method, note },
        }).unwrap(),
    });
  }

  function cancelPayment(record: Payment, studentId = selectedStudent?.id) {
    if (!studentId) return;
    let reason = "";
    modal.confirm({
      title: "To‘lovni qaytarish",
      content: (
        <Input
          placeholder="Sababni kiriting"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: "Tasdiqlash",
      cancelText: "Yopish",
      onOk: async () => {
        if (!reason.trim()) throw new Error("Sabab kiritilishi kerak");
        await reversePayment({
          paymentId: record.id,
          studentId,
          reason,
        }).unwrap();
      },
    });
  }

  function renderPaymentActions(record: Payment, studentId?: string) {
    if (user?.role !== "owner" || record.status !== "active" || !studentId)
      return null;

    return (
      <Space className="payment-actions-group">
        <Button
          size="small"
          icon={<Edit3 size={14} />}
          className="action-edit-button"
          title="To'lovni tahrirlash"
          onClick={() => editPayment(record, studentId)}
        >
        </Button>
        <Button
          size="small"
          danger
          icon={<Trash2 size={14} />}
          className="action-delete-button"
          title="Qaytarish"
          onClick={() => cancelPayment(record, studentId)}
        >
        </Button>
      </Space>
    );
  }

  function openDebtorPaymentModal(debtor: Debtor) {
    setSelectedDebtor(debtor);
    setSelectedPaymentMethod("cash");
    multiMonthPaymentForm.setFieldsValue({
      amount: debtor.totalDebt,
      note: "",
    });
  }

  function closeDebtorPaymentModal() {
    setSelectedDebtor(null);
    multiMonthPaymentForm.resetFields();
  }

  function openSmsReminderModal() {
    const defaultMessage =
      "Assalomu alaykum, qarzdorlik bo'yicha ogohlantirish.";
    let messageText = smsDraft.trim() || defaultMessage;
    const selectedIds = selectedSmsStudentIds.map(String).filter(Boolean);

    if (!selectedIds.length) {
      message.warning("Avval kamida bitta qarzdorni belgilang");
      return;
    }

    const targetStudents = smsDebtors.filter((debtor) =>
      selectedIds.includes(debtor.studentId),
    );

    if (!targetStudents.length) {
      message.warning("Tanlangan qarzdorlar joriy ro‘yxatda topilmadi");
      return;
    }

    modal.confirm({
      title: selectedIds.length
        ? "Tanlangan qarzdorlarga SMS yuborish"
        : "Qarzdorlarga SMS yuborish",
      className: "sms-reminder-confirm",
      content: (
        <div className="sms-reminder-confirm-body">
          <p>
            {selectedIds.length
              ? `SMS ${targetStudents.length} ta tanlangan qarzdorga yuboriladi.`
              : "SMS avtomatik ravishda qarzdorlarga yuboriladi."}{" "}
            Agar o‘quvchining ota-onasi raqami mavjud bo‘lsa, xabar o‘sha
            raqamga ketadi, aks holda o‘quvchining o‘z raqamiga yuboriladi.
          </p>
          <Input.TextArea
            rows={5}
            defaultValue={messageText}
            onChange={(event) => {
              messageText = event.target.value;
              setSmsDraft(event.target.value);
            }}
            placeholder="SMS matnini kiriting"
          />
        </div>
      ),
      okText: "Yuborish",
      cancelText: "Bekor qilish",
      okButtonProps: { loading: isSendingDebtorSms, type: "primary" },
      async onOk() {
        try {
          const response = await sendDebtorSmsReminders({
            message: messageText.trim() || undefined,
            studentIds: selectedIds.length ? selectedIds : undefined,
          }).unwrap();
          setSelectedSmsStudentIds([]);
          message.success(
            `${response.sentCount} ta SMS yuborildi${response.failedCount ? `, ${response.failedCount} ta xatolik bo'ldi` : ""}`,
          );
          return true;
        } catch (error) {
          const apiError = error as { data?: { message?: string } };
          message.error(apiError.data?.message || "SMS yuborib bo‘lmadi");
          throw error;
        }
      },
    });
  }

  function openDebtorMonthsModal(debtor: Debtor) {
    setDebtorMonthsModal(debtor);
  }

  async function payMultipleMonths(values: MultiMonthPaymentFormValues) {
    if (!selectedDebtor) return;

    try {
      const payment = await createPayment({
        studentId: selectedDebtor.studentId,
        body: {
          amount: values.amount,
          method: selectedPaymentMethod,
          note: values.note?.trim() || "Bir nechta oy uchun to'lov",
        },
      }).unwrap();
      setReceipt({
        payment,
        studentName: selectedDebtor.fullName,
        subject: selectedDebtor.subject,
      });
      message.success("To'lov eng eski qarzlardan boshlab taqsimlandi");
      closeDebtorPaymentModal();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || "To'lovni saqlab bo'lmadi");
    }
  }

  async function payDebtMonth(month: Debtor["months"][number]) {
    if (!selectedDebtor) return;

    setLoadingBalanceId(month.balanceId);

    try {
      const payment = await createPayment({
        studentId: selectedDebtor.studentId,
        body: {
          amount: month.debtAmount,
          method: selectedPaymentMethod,
          targetMonth: month.month,
          targetBalanceId: month.balanceId,
          note: `${month.month} oyi uchun to'lov`,
        },
      }).unwrap();
      setReceipt({
        payment,
        studentName: selectedDebtor.fullName,
        subject: selectedDebtor.subject,
      });
      message.success("To'lov saqlandi");
      closeDebtorPaymentModal();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || "To'lovni saqlab bo'lmadi");
    } finally {
      setLoadingBalanceId(null);
    }
  }

  return (
    <section className="page payments-page">
      {modalContextHolder}
      {isError ? (
        <Alert
          className="page-alert"
          type="error"
          message="To'lovlar ma'lumotini yuklab bo'lmadi."
          showIcon
        />
      ) : null}

      <Tabs className="payments-tabs">
        <Tabs.TabPane key="student-payment" tab="O'quvchi bo'yicha">
          <div className="payments-student-panel">
            <Input
              prefix={<Search size={17} />}
              allowClear
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Ism yoki telefon bo‘yicha qidiring"
              className="payments-student-search"
            />

            <div className="payments-student-table-wrapper">
              <Table
                className="students-table"
                rowKey="id"
                size="small"
                loading={isStudentsFetching}
                dataSource={studentsResponse?.data || []}
                pagination={false}
                columns={[
                  {
                    title: "F.I.Sh",
                    dataIndex: "fullName",
                    onCell: () => mobileCellLabel("F.I.Sh"),
                  },
                  {
                    title: "Telefon",
                    dataIndex: "phone",
                    onCell: () => mobileCellLabel("Telefon"),
                    render: (value: string) => formatUzPhoneDisplay(value),
                  },
                  {
                    title: "Guruh",
                    onCell: () => mobileCellLabel("Guruh"),
                    render: (_value, record: Student) =>
                      record.group?.name || "-",
                  },
                  {
                    title: "Holat",
                    dataIndex: "paymentStatus",
                    onCell: () => mobileCellLabel("Holat"),
                    render: (value) => (
                      <Tag color={value === "paid" ? "green" : "red"}>
                        {value === "paid" ? "Qarzsiz" : "Qarzdor"}
                      </Tag>
                    ),
                  },
                  {
                    title: "Amal",
                    width: 130,
                    onCell: () => mobileCellLabel("Amal"),
                    render: (_value, record: Student) => (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                          setSelectedStudent(record);
                          studentPaymentForm.setFieldsValue({
                            method: "cash",
                            isAdvance: false,
                          });
                        }}
                      >
                        To‘lovlar
                      </Button>
                    ),
                  },
                ]}
              />
            </div>

            <div className="payments-student-mobile-list">
              {(studentsResponse?.data || []).map((student) => (
                <div key={student.id} className="payments-student-mobile-card">
                  <div className="payments-student-mobile-row">
                    <span>F.I.Sh</span>
                    <strong>{student.fullName}</strong>
                  </div>
                  <div className="payments-student-mobile-row">
                    <span>Telefon</span>
                    <strong>{formatUzPhoneDisplay(student.phone)}</strong>
                  </div>
                  <div className="payments-student-mobile-row">
                    <span>Guruh</span>
                    <strong>{student.group?.name || "-"}</strong>
                  </div>
                  <div className="payments-student-mobile-row">
                    <span>Holat</span>
                    <Tag color={student.paymentStatus === "paid" ? "green" : "red"}>
                      {student.paymentStatus === "paid" ? "Qarzsiz" : "Qarzdor"}
                    </Tag>
                  </div>
                  <Button
                    type="primary"
                    size="middle"
                    className="payments-student-mobile-action"
                    onClick={() => {
                      setSelectedStudent(student);
                      studentPaymentForm.setFieldsValue({
                        method: "cash",
                        isAdvance: false,
                      });
                    }}
                  >
                    To‘lovlar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="payments" tab="To'lovlar">
          <div className="payment-overview-grid">
            <div className="payment-overview-column">
              <div className="payments-stat">
                <span>Bugungi to'lov</span>
                <strong>{formatMoney(data?.today.totalAmount)}</strong>
                <MethodTotals totals={data?.today.totalsByMethod} />
              </div>
              <PaymentMethodChart
                title="Bugungi to'lovlar ulushi"
                total={data?.today.totalAmount}
                totals={data?.today.totalsByMethod}
              />
            </div>
            <div className="payment-overview-column">
              <div className="payments-stat">
                <span>So‘nggi to‘lovlar</span>
                <strong>{formatMoney(data?.recentPayments.totalAmount)}</strong>
                <MethodTotals totals={data?.recentPayments.totalsByMethod} />
              </div>
              <PaymentMethodChart
                title="So‘nggi to‘lovlar ulushi"
                total={data?.recentPayments.totalAmount}
                totals={data?.recentPayments.totalsByMethod}
              />
            </div>
          </div>

          <Table
            className="payments-open-period-desktop-table"
            rowKey="id"
            size="small"
            loading={isFetching}
            dataSource={data?.recentPayments.payments || []}
            pagination={false}
            scroll={{ x: 860 }}
            columns={[
              {
                title: "Sana",
                dataIndex: "paidAt",
                render: (value) => dayjs(value).format("DD.MM.YYYY HH:mm"),
              },
              {
                title: "Summa",
                dataIndex: "amount",
                render: (value) => formatMoney(value),
              },
              {
                title: "Usul",
                dataIndex: "method",
                render: (value: PaymentMethod) => paymentMethodLabels[value],
              },
              {
                title: "Izoh",
                dataIndex: "note",
                render: (value) => value || "-",
              },
            ]}
          />

          <div className="payments-open-period-mobile-list">
            {(data?.recentPayments.payments || []).map((payment) => (
              <div key={payment.id} className="payments-open-period-mobile-card">
                <div className="payments-open-period-mobile-row">
                  <span>Sana</span>
                  <strong>{dayjs(payment.paidAt).format("DD.MM.YYYY HH:mm")}</strong>
                </div>
                <div className="payments-open-period-mobile-row">
                  <span>Summa</span>
                  <strong>{formatMoney(payment.amount)}</strong>
                </div>
                <div className="payments-open-period-mobile-row">
                  <span>Usul</span>
                  <strong>{paymentMethodLabels[payment.method]}</strong>
                </div>
                {payment.note ? (
                  <div className="payments-open-period-mobile-row">
                    <span>Izoh</span>
                    <strong>{payment.note}</strong>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

        </Tabs.TabPane>
        <Tabs.TabPane key="history" tab="To‘lovlar tarixi">
          <Table
            className="payments-history-desktop-table"
            rowKey="id"
            size="small"
            loading={isHistoryFetching}
            dataSource={paymentHistory?.data || []}
            pagination={false}
            tableLayout="fixed"
            columns={[
              {
                title: "Sana",
                width: 104,
                dataIndex: "paidAt",
                render: (value) => dayjs(value).format("DD.MM.YYYY HH:mm"),
              },
              {
                title: "O‘quvchi",
                width: 122,
                render: (_value, record: PaymentHistoryItem) =>
                  record.student?.fullName || "-",
              },
              {
                title: "Telefon",
                width: 128,
                render: (_value, record: PaymentHistoryItem) =>
                  record.student?.phone
                    ? formatUzPhoneDisplay(record.student.phone)
                    : "-",
              },
              {
                title: "Summa / usul",
                width: 144,
                render: (_value, record: PaymentHistoryItem) => (
                  <PaymentAmountMethodCell amount={record.amount} method={record.method} />
                ),
              },
              {
                title: "To‘lov holati",
                width: 92,
                dataIndex: "status",
                render: (value) => (
                  <Tag color={value === "active" ? "green" : "red"}>
                    {value === "active"
                      ? "Faol"
                      : value === "refunded"
                        ? "Qaytarilgan"
                        : "Bekor"}
                  </Tag>
                ),
              },
              {
                title: "Izoh",
                width: 128,
                dataIndex: "note",
                render: (value) => value || "-",
              },
              {
                title: "Amallar",
                width: 88,
                render: (_value, record: PaymentHistoryItem) =>
                  renderPaymentActions(record, record.student?.id),
              },
            ]}
          />
          <div className="payments-history-mobile-list">
            {(paymentHistory?.data || []).map((record) => (
              <div key={record.id} className="payments-history-mobile-card">
                <div className="payments-history-mobile-row">
                  <span>Sana</span>
                  <strong>{dayjs(record.paidAt).format("DD.MM.YYYY HH:mm")}</strong>
                </div>
                <div className="payments-history-mobile-row">
                  <span>O‘quvchi</span>
                  <strong>{record.student?.fullName || "-"}</strong>
                </div>
                <div className="payments-history-mobile-row">
                  <span>Telefon</span>
                  <strong>
                    {record.student?.phone
                      ? formatUzPhoneDisplay(record.student.phone)
                      : "-"}
                  </strong>
                </div>
                <div className="payments-history-mobile-row">
                  <span>Summa / usul</span>
                  <PaymentAmountMethodCell amount={record.amount} method={record.method} />
                </div>
                <div className="payments-history-mobile-row">
                  <span>To‘lov holati</span>
                  <Tag color={record.status === "active" ? "green" : "red"}>
                    {record.status === "active"
                      ? "Faol"
                      : record.status === "refunded"
                        ? "Qaytarilgan"
                        : "Bekor"}
                  </Tag>
                </div>
                {record.note ? (
                  <div className="payments-history-mobile-row">
                    <span>Izoh</span>
                    <strong>{record.note}</strong>
                  </div>
                ) : null}
                {renderPaymentActions(record, record.student?.id) ? (
                  <div className="payments-history-mobile-actions">
                    {renderPaymentActions(record, record.student?.id)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="debtors" tab="Qarzdorlar">
          <Table
            className="payments-debtors-desktop-table"
            rowKey="studentId"
            size="small"
            loading={isDebtorsFetching}
            dataSource={debtorsResponse?.data || []}
            pagination={false}
            scroll={{ x: 820 }}
            columns={[
              { title: "F.I.Sh", dataIndex: "fullName" },
              {
                title: "Telefon",
                dataIndex: "phone",
                render: (_value, record: Debtor) => (
                  <PhoneCell debtor={record} />
                ),
              },
              { title: "Guruh", dataIndex: "groupName" },
              {
                title: "Umumiy qarz",
                dataIndex: "totalDebt",
                render: (value) => (
                  <span className="danger-text">{formatMoney(value)}</span>
                ),
              },
              {
                title: "Oylar",
                width: 110,
                render: (_value, record: Debtor) => (
                  <Button
                    size="small"
                    onClick={() => openDebtorMonthsModal(record)}
                  >
                    Ko‘rish
                  </Button>
                ),
              },
              {
                title: "To'lov",
                width: 110,
                render: (_value, record: Debtor) => (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CircleDollarSign size={15} />}
                    onClick={() => openDebtorPaymentModal(record)}
                  >
                    To'lash
                  </Button>
                ),
              },
            ]}
          />
          <div className="payments-debtors-mobile-list">
            {(debtorsResponse?.data || []).map((debtor) => (
              <div key={debtor.studentId} className="payments-debtors-mobile-card">
                <div className="payments-debtors-mobile-row">
                  <span>F.I.Sh</span>
                  <strong>{debtor.fullName}</strong>
                </div>
                <div className="payments-debtors-mobile-row">
                  <span>Telefon</span>
                  <strong>{formatUzPhoneDisplay(debtor.phone)}</strong>
                </div>
                <div className="payments-debtors-mobile-row">
                  <span>Guruh</span>
                  <strong>{debtor.groupName || "-"}</strong>
                </div>
                <div className="payments-debtors-mobile-row">
                  <span>Umumiy qarz</span>
                  <strong className="danger-text">{formatMoney(debtor.totalDebt)}</strong>
                </div>
                <div className="payments-debtors-mobile-actions">
                  <Button size="small" onClick={() => openDebtorMonthsModal(debtor)}>
                    Ko‘rish
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CircleDollarSign size={15} />}
                    onClick={() => openDebtorPaymentModal(debtor)}
                  >
                    To‘lash
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="sms" tab="SMS yuborish">
          <div className="sms-reminder-panel">
            <div className="dashboard-panel sms-reminder-summary">
              <div className="payments-stat">
                <span>Qarzdorlar soni</span>
                <strong>{debtorsResponse?.data?.length || 0}</strong>
              </div>
              <div className="payments-stat">
                <span>Jami qarz</span>
                <strong className="danger-text">
                  {formatMoney(
                    (debtorsResponse?.data || []).reduce(
                      (sum, debtor) => sum + Number(debtor.totalDebt || 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
              <div className="payments-stat">
                <span>Yuborish qoidasi</span>
                <strong>ota-ona, bo‘lmasa o‘quvchi</strong>
              </div>
            </div>

            <div className="dashboard-panel sms-reminder-actions">
              <div>
                <h3>Qarzdorlarga SMS yuborish</h3>
                <p>
                  Kerakli qarzdorlarni checkbox orqali belgilang yoki qidiruv
                  bilan toping. Ota-onaning raqami bo‘lsa o‘sha raqam tanlanadi,
                  aks holda o‘quvchining o‘z raqamiga yuboriladi.
                </p>
              </div>
              <Button
                type="primary"
                danger
                size="large"
                loading={isSendingDebtorSms}
                onClick={openSmsReminderModal}
              >
                Tanlanganlarga SMS yuborish
              </Button>
            </div>

            <Space wrap className="page-actions sms-reminder-toolbar">
              <Input
                allowClear
                prefix={<Search size={17} />}
                placeholder="F.I.Sh, telefon, guruh yoki qarz bo‘yicha qidirish"
                value={smsSearch}
                onChange={(event) => setSmsSearch(event.target.value)}
                style={{ width: 360 }}
              />
              <Button
                onClick={() =>
                  setSelectedSmsStudentIds(
                    smsDebtors.map((item) => item.studentId),
                  )
                }
                disabled={!smsDebtors.length}
              >
                Hammasini belgilash
              </Button>
              <Button
                onClick={() => setSelectedSmsStudentIds([])}
                disabled={!selectedSmsStudentIds.length}
              >
                Belgilashni tozalash
              </Button>
              <Tag color="blue">
                {selectedSmsStudentIds.length
                  ? `${selectedSmsStudentIds.length} ta tanlangan`
                  : "Hech narsa tanlanmagan"}
              </Tag>
            </Space>

            <Table
              rowKey="studentId"
              size="small"
              loading={isDebtorsFetching}
              dataSource={smsDebtors}
              pagination={false}
              scroll={{ x: 820 }}
              rowSelection={{
                selectedRowKeys: selectedSmsStudentIds,
                onChange: (keys) => setSelectedSmsStudentIds(keys.map(String)),
                getCheckboxProps: (record: Debtor) => ({
                  disabled: !record.studentId,
                }),
              }}
              columns={[
                { title: "F.I.Sh", dataIndex: "fullName" },
                {
                  title: "Telefon",
                  dataIndex: "phone",
                  render: (_value, record: Debtor) => (
                    <PhoneCell debtor={record} />
                  ),
                },
                {
                  title: "Raqam yo‘nalishi",
                  render: (_value, record: Debtor) =>
                    record.parentPhone ? "Ota-ona raqami" : "O‘quvchi raqami",
                },
                {
                  title: "Umumiy qarz",
                  dataIndex: "totalDebt",
                  render: (value) => (
                    <span className="danger-text">{formatMoney(value)}</span>
                  ),
                },
              ]}
            />

            <div className="dashboard-panel sms-history-panel">
              <div className="sms-history-header">
                <div>
                  <h3>Eskiz hisobot</h3>
                  <p>
                    Bu bo‘lim Eskizning o‘z hisobotini ko‘rsatadi. Local tarix
                    saqlanmaydi.
                  </p>
                </div>
                <Tag color={smsReportStatus === "success" ? "green" : "blue"}>
                  {smsReportStatus.toUpperCase()}
                </Tag>
              </div>
              <Table
                rowKey={(record) =>
                  `${record.month || "unknown"}-${record.status || "unknown"}`
                }
                size="small"
                loading={isSmsReportFetching}
                dataSource={smsReportItems}
                pagination={false}
                scroll={{ x: 860 }}
                locale={{ emptyText: "Bu oy uchun Eskiz report topilmadi" }}
                columns={[
                  { title: "Oy", dataIndex: "month" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (value) => (
                      <Tag
                        color={
                          value === "DELIVERED"
                            ? "green"
                            : value
                              ? "gold"
                              : "default"
                        }
                      >
                        {value || "-"}
                      </Tag>
                    ),
                  },
                  {
                    title: "Paketlar",
                    dataIndex: "packets",
                    render: (value) => Number(value || 0),
                  },
                  {
                    title: "Yuborilgan",
                    dataIndex: "sent_packets",
                    render: (value) => Number(value || 0),
                  },
                  {
                    title: "Izoh",
                    render: (_value, record) => {
                      const statusText =
                        record.status === "DELIVERED"
                          ? "Yuborilgan SMSlar Eskizda muvaffaqiyatli qayd etilgan."
                          : "Eskizdan qo‘shimcha holat qaytmadi.";
                      return statusText;
                    },
                  },
                ]}
              />
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="report" tab="Hisobot">
          <div className="dashboard-panel payments-report-panel">
            <div className="payments-report-toolbar">
              <DatePicker.RangePicker
                className="payments-report-range-picker"
                popupClassName="mobile-range-picker-dropdown"
                inputReadOnly
                value={reportRange}
                format="DD.MM.YYYY"
                allowClear={false}
                onChange={(values) => {
                  if (values?.[0] && values[1]) {
                    setReportRange([values[0], values[1]]);
                    setReportPaymentPage(1);
                  }
                }}
              />
              <Button
                className="payments-report-export-button"
                icon={<Download size={16} />}
                loading={isExportingReport}
                onClick={exportReport}
              >
                <span>Yuklab olish</span>
              </Button>
            </div>
            <div className="dashboard-kpi-grid payments-report-kpi-grid">
              <div className="payments-stat payments-report-stat payments-report-stat-income">
                <span>Kirim</span>
                <strong>{formatMoney(report?.income)}</strong>
                <small>{report?.paymentsCount || 0} ta to‘lov</small>
              </div>
              <div className="payments-stat payments-report-stat payments-report-stat-expense">
                <span>Xarajat</span>
                <strong>{formatMoney(report?.expense)}</strong>
                <small>{report?.expensesCount || 0} ta xarajat</small>
              </div>
              <div
                className={`payments-stat payments-report-stat payments-report-stat-${Number(report?.net || 0) >= 0 ? "success" : "expense"}`}
              >
                <span>Sof natija</span>
                <strong>{formatMoney(report?.net)}</strong>
              </div>
              <div className="payments-stat payments-report-stat payments-report-stat-debt">
                <span>Jami qarz</span>
                <strong>{formatMoney(report?.debt)}</strong>
              </div>
            </div>
            {isReportFetching ? <p>Hisobot yangilanmoqda...</p> : null}
            <Space wrap className="page-actions payments-report-filters">
              <Select
                className="payments-report-method-select"
                allowClear
                placeholder="To'lov usuli"
                value={reportPaymentMethod}
                onChange={(method) => {
                  setReportPaymentMethod(method);
                  setReportPaymentPage(1);
                }}
                options={(
                  Object.entries(paymentMethodLabels) as [
                    PaymentMethod,
                    string,
                  ][]
                ).map(([value, label]) => ({ value, label }))}
              />
              <Input
                className="payments-report-search-input"
                allowClear
                prefix={<Search size={17} />}
                placeholder="O'quvchi yoki telefon"
                value={reportPaymentSearch}
                onChange={(event) => {
                  setReportPaymentSearch(event.target.value);
                  setReportPaymentPage(1);
                }}
              />
            </Space>
            <Table
              className="payments-report-desktop-table"
              rowKey="id"
              size="small"
              loading={isReportPaymentsFetching}
              dataSource={reportPayments?.data || []}
              scroll={{ x: 800 }}
              pagination={{
                current: reportPaymentPage,
                pageSize: 20,
                total: reportPayments?.pagination.total || 0,
                showSizeChanger: false,
                showTotal: (total) => `Jami ${total} ta to'lov`,
                onChange: setReportPaymentPage,
              }}
              locale={{ emptyText: "Tanlangan davrda to'lov topilmadi" }}
              columns={[
                {
                  title: "Sana",
                  dataIndex: "paidAt",
                  render: (value) => dayjs(value).format("DD.MM.YYYY HH:mm"),
                },
                {
                  title: "O'quvchi",
                  render: (_value, record: PaymentHistoryItem) =>
                    record.student?.fullName || "-",
                },
                {
                  title: "Telefon",
                  render: (_value, record: PaymentHistoryItem) =>
                    record.student?.phone
                      ? formatUzPhoneDisplay(record.student.phone)
                      : "-",
                },
                {
                  title: "Summa",
                  dataIndex: "amount",
                  render: formatMoney,
                },
                {
                  title: "Usul",
                  dataIndex: "method",
                  render: (value: PaymentMethod) =>
                    paymentMethodLabels[value] || value,
                },
                {
                  title: "Kiritgan",
                  dataIndex: "createdBy",
                  render: (value) => value?.fullName || "-",
                },
                {
                  title: "Izoh",
                  dataIndex: "note",
                  render: (value) => value || "-",
                },
                {
                  title: "Amallar",
                  width: 88,
                  render: (_value, record: PaymentHistoryItem) =>
                    renderPaymentActions(record, record.student?.id),
                },
              ]}
            />
            <div className="payments-report-mobile-list">
              {(reportPayments?.data || []).map((record) => (
                <div key={record.id} className="payments-report-mobile-card">
                  <div className="payments-report-mobile-row">
                    <span>Sana</span>
                    <strong>
                      {dayjs(record.paidAt).format("DD.MM.YYYY HH:mm")}
                    </strong>
                  </div>
                  <div className="payments-report-mobile-row">
                    <span>O‘quvchi</span>
                    <strong>{record.student?.fullName || "-"}</strong>
                  </div>
                  <div className="payments-report-mobile-row">
                    <span>Telefon</span>
                    <strong>
                      {record.student?.phone
                        ? formatUzPhoneDisplay(record.student.phone)
                        : "-"}
                    </strong>
                  </div>
                  <div className="payments-report-mobile-row">
                    <span>Summa / usul</span>
                    <PaymentAmountMethodCell
                      amount={record.amount}
                      method={record.method}
                    />
                  </div>
                  <div className="payments-report-mobile-row">
                    <span>Kiritgan</span>
                    <strong>{record.createdBy?.fullName || "-"}</strong>
                  </div>
                  <div className="payments-report-mobile-row">
                    <span>Izoh</span>
                    <strong>{record.note || "-"}</strong>
                  </div>
                  {renderPaymentActions(record, record.student?.id) ? (
                    <div className="payments-report-mobile-actions">
                      {renderPaymentActions(record, record.student?.id)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>

      <Modal
        className="student-payment-modal"
        title={
          selectedStudent
            ? `${selectedStudent.fullName} — to‘lovlar`
            : "O‘quvchi to‘lovlari"
        }
        open={Boolean(selectedStudent)}
        onCancel={() => setSelectedStudent(null)}
        footer={null}
        width={1100}
      >
        {selectedStudent ? (
          <>
            <div className="finance-summary">
              <div>
                <span>Umumiy qarz</span>
                <strong
                  className={
                    selectedFinance?.summary.totalDebt
                      ? "danger-text"
                      : "success-text"
                  }
                >
                  {formatMoney(selectedFinance?.summary.totalDebt)}
                </strong>
              </div>
              <div>
                <span>Oldindan to‘lov</span>
                <strong>
                  {formatMoney(selectedFinance?.summary.advanceBalance)}
                </strong>
              </div>
              <div className="student-finance-phone-row">
                <span>Telefon</span>
                <strong>{formatUzPhoneDisplay(selectedStudent.phone)}</strong>
              </div>
            </div>
            <Form
              form={studentPaymentForm}
              layout="vertical"
              onFinish={submitStudentPayment}
              className="finance-inline-form"
            >
              <Form.Item
                name="method"
                label="To‘lov usuli"
                rules={[{ required: true }]}
              >
                <PaymentMethodSelector />
              </Form.Item>
              <Form.Item
                name="amount"
                label="Summa"
                rules={[{ required: true, message: "Summani kiriting" }]}
              >
                <InputNumber<number>
                  min={1}
                  className="full-width"
                  formatter={(value) =>
                    `${value || ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                  }
                  parser={(value) => Number(value?.replace(/\s/g, "") || 0)}
                />
              </Form.Item>
              <Form.Item
                name="isAdvance"
                label="Oldindan to‘lov"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item name="note" label="Izoh">
                <Input />
              </Form.Item>
              <Form.Item className="finance-submit-item">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isPaymentSaving}
                >
                  To‘lovni saqlash
                </Button>
              </Form.Item>
            </Form>
            {selectedFinance?.summary.totalDebt ? (
              <Alert
                type="info"
                showIcon
                message="Oldindan to‘lov qilishdan avval barcha eski qarzlar yopilishi kerak."
                className="page-alert"
              />
            ) : null}
            <Tabs
              items={[
                {
                  key: "debts",
                  label: "Qarzlar",
                  children: (
                    <>
                      <Table
                        className="student-finance-desktop-table"
                        rowKey="id"
                        size="small"
                        loading={isSelectedFinanceFetching}
                        dataSource={selectedFinance?.balances || []}
                        pagination={false}
                        columns={[
                          { title: "Oy", dataIndex: "month" },
                          {
                            title: "Guruh",
                            dataIndex: "groupId",
                            render: (groupId) =>
                              selectedFinance?.enrollments.find(
                                (item) => item.groupId === groupId,
                              )?.groupName || "-",
                          },
                          {
                            title: "Hisoblangan",
                            dataIndex: "chargedAmount",
                            render: formatMoney,
                          },
                          {
                            title: "To‘langan",
                            dataIndex: "paidAmount",
                            render: formatMoney,
                          },
                          {
                            title: "Qarz",
                            dataIndex: "debtAmount",
                            render: (value) => (
                              <span
                                className={value ? "danger-text" : "success-text"}
                              >
                                {formatMoney(value)}
                              </span>
                            ),
                          },
                        ]}
                      />
                      <div className="student-finance-mobile-list">
                        {(selectedFinance?.balances || []).map((item) => (
                          <div key={item.id} className="student-finance-mobile-card">
                            <div className="student-finance-mobile-row">
                              <span>Oy</span>
                              <strong>{item.month}</strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Guruh</span>
                              <strong>
                                {selectedFinance?.enrollments.find(
                                  (enrollment) =>
                                    enrollment.groupId === item.groupId,
                                )?.groupName || "-"}
                              </strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Hisoblangan</span>
                              <strong>{formatMoney(item.chargedAmount)}</strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>To‘langan</span>
                              <strong>{formatMoney(item.paidAmount)}</strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Qarz</span>
                              <strong
                                className={
                                  item.debtAmount ? "danger-text" : "success-text"
                                }
                              >
                                {formatMoney(item.debtAmount)}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ),
                },
                {
                  key: "student-history",
                  label: "To‘lov tarixi",
                  children: (
                    <>
                      <Table
                        className="student-finance-desktop-table"
                        rowKey="id"
                        size="small"
                        loading={isSelectedFinanceFetching}
                        dataSource={selectedFinance?.payments || []}
                        pagination={false}
                        scroll={{ x: 900 }}
                        columns={[
                          {
                            title: "Sana",
                            dataIndex: "paidAt",
                            render: (value) =>
                              dayjs(value).format("DD.MM.YYYY HH:mm"),
                          },
                          {
                            title: "Summa",
                            dataIndex: "amount",
                            render: formatMoney,
                          },
                          {
                            title: "Usul",
                            dataIndex: "method",
                            render: (value: PaymentMethod) =>
                              paymentMethodLabels[value] || value,
                          },
                          {
                            title: "Avans",
                            dataIndex: "advanceAmount",
                            render: formatMoney,
                          },
                          {
                            title: "Holat",
                            dataIndex: "status",
                            render: (value) => (
                              <Tag color={value === "active" ? "green" : "red"}>
                                {value === "active"
                                  ? "Faol"
                                  : value === "refunded"
                                    ? "Qaytarilgan"
                                    : "Bekor"}
                              </Tag>
                            ),
                          },
                          {
                            title: "Izoh",
                            dataIndex: "note",
                            render: (value) => value || "-",
                          },
                          {
                            title: "Amallar",
                            width: 88,
                            render: (_value, record: Payment) =>
                              renderPaymentActions(record, selectedStudent.id),
                          },
                        ]}
                      />
                      <div className="student-finance-mobile-list">
                        {(selectedFinance?.payments || []).map((item) => (
                          <div key={item.id} className="student-finance-mobile-card">
                            <div className="student-finance-mobile-row">
                              <span>Sana</span>
                              <strong>
                                {dayjs(item.paidAt).format("DD.MM.YYYY HH:mm")}
                              </strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Summa</span>
                              <strong>{formatMoney(item.amount)}</strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Usul</span>
                              <strong>
                                {paymentMethodLabels[item.method] || item.method}
                              </strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Avans</span>
                              <strong>{formatMoney(item.advanceAmount)}</strong>
                            </div>
                            <div className="student-finance-mobile-row">
                              <span>Holat</span>
                              <Tag color={item.status === "active" ? "green" : "red"}>
                                {item.status === "active"
                                  ? "Faol"
                                  : item.status === "refunded"
                                    ? "Qaytarilgan"
                                    : "Bekor"}
                              </Tag>
                            </div>
                            {item.note ? (
                              <div className="student-finance-mobile-row">
                                <span>Izoh</span>
                                <strong>{item.note}</strong>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </Modal>

      <Modal
        title={
          selectedDebtor
            ? `${selectedDebtor.fullName} - qarz oylari`
            : "Qarz oylari"
        }
        open={Boolean(selectedDebtor)}
        onCancel={closeDebtorPaymentModal}
        footer={null}
        width={680}
        afterClose={() => setLoadingBalanceId(null)}
      >
        {selectedDebtor ? (
          <div className="debt-payment-modal">
            <div className="payment-confirm-box">
              <div className="debt-payment-phone-row">
                <span>Telefon</span>
                <strong>
                  {formatUzPhoneDisplay(selectedDebtor.phone)}
                  {selectedDebtor.secondaryPhone
                    ? ` / ${formatUzPhoneDisplay(selectedDebtor.secondaryPhone)}`
                    : ""}
                </strong>
              </div>
              <div>
                <span>Guruh</span>
                <strong>{selectedDebtor.groupName}</strong>
              </div>
              <div>
                <span>To'lov usuli</span>
                <PaymentMethodSelector
                  value={selectedPaymentMethod}
                  onChange={setSelectedPaymentMethod}
                />
              </div>
            </div>

            <Form
              form={multiMonthPaymentForm}
              layout="vertical"
              className="multi-month-payment-form"
              onFinish={payMultipleMonths}
            >
              <Form.Item
                name="amount"
                label="Umumiy to'lov summasi"
                rules={[
                  { required: true, message: "To'lov summasini kiriting" },
                  {
                    type: "number",
                    min: 1000,
                    message: "To'lov summasi kamida 1000 so'm bo'lishi kerak",
                  },
                ]}
              >
                <InputNumber<number>
                  min={1000}
                  className="full-width"
                  addonAfter="so'm"
                  formatter={(value) =>
                    `${value || ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                  }
                  parser={(value) => Number(value?.replace(/\s/g, "") || 0)}
                  placeholder="Masalan: 1 200 000"
                />
              </Form.Item>
              <Form.Item name="note" label="Izoh">
                <Input placeholder="Masalan: 3 oy uchun to'lov" />
              </Form.Item>
              <Form.Item className="multi-month-payment-submit">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isPaymentSaving}
                  icon={<CircleDollarSign size={16} />}
                >
                  Umumiy to'lov qilish
                </Button>
              </Form.Item>
            </Form>

            <div className="payment-allocation-preview">
              <div className="payment-allocation-heading">
                <span>Summa taqsimoti</span>
                <small>Eng eski qarzdan boshlanadi</small>
              </div>
              <div className="payment-allocation-list">
                {(() => {
                  let remainder = Number(enteredPaymentAmount) || 0;

                  return selectedDebtor.months.map((month) => {
                    const allocatedAmount = Math.min(
                      remainder,
                      month.debtAmount,
                    );
                    remainder = Math.max(remainder - allocatedAmount, 0);

                    return (
                      <div
                        key={month.balanceId}
                        className={allocatedAmount > 0 ? "is-allocated" : ""}
                      >
                        <span>
                          {month.groupName} / {month.month}
                        </span>
                        <strong>{formatMoney(allocatedAmount)}</strong>
                        <small>{formatMoney(month.debtAmount)} qarz</small>
                      </div>
                    );
                  });
                })()}
                {enteredPaymentAmount > selectedDebtor.totalDebt ? (
                  <div className="is-advance">
                    <span>Avans</span>
                    <strong>
                      {formatMoney(
                        enteredPaymentAmount - selectedDebtor.totalDebt,
                      )}
                    </strong>
                    <small>Keyingi oylar uchun</small>
                  </div>
                ) : null}
              </div>
            </div>

            <Table
              className="debt-payment-desktop-table"
              rowKey="balanceId"
              size="small"
              dataSource={selectedDebtor.months}
              pagination={false}
              columns={[
                { title: "Oy", dataIndex: "month" },
                { title: "Guruh", dataIndex: "groupName" },
                {
                  title: "Qarz",
                  dataIndex: "debtAmount",
                  render: (value) => (
                    <span className="danger-text">{formatMoney(value)}</span>
                  ),
                },
                {
                  title: "To'lash",
                  width: 110,
                  render: (_value, record: Debtor["months"][number]) => (
                  <Button
                    size="small"
                    type="primary"
                    loading={loadingBalanceId === record.balanceId}
                    icon={<CircleDollarSign size={15} />}
                    onClick={() => payDebtMonth(record)}
                  >
                      To'lash
                    </Button>
                  ),
                },
              ]}
            />

            <div className="debt-payment-mobile-list">
              {selectedDebtor.months.map((month) => (
                <div key={month.balanceId} className="debt-payment-mobile-card">
                  <div className="debt-payment-mobile-row">
                    <span>Oy</span>
                    <strong>{month.month}</strong>
                  </div>
                  <div className="debt-payment-mobile-row">
                    <span>Guruh</span>
                    <strong>{month.groupName}</strong>
                  </div>
                  <div className="debt-payment-mobile-row">
                    <span>Qarz</span>
                    <strong className="danger-text">
                      {formatMoney(month.debtAmount)}
                    </strong>
                  </div>
                  <Button
                    className="debt-payment-mobile-action"
                    type="primary"
                    loading={loadingBalanceId === month.balanceId}
                    icon={<CircleDollarSign size={15} />}
                    onClick={() => payDebtMonth(month)}
                  >
                    To'lash
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className="debtor-months-modal"
        title={
          debtorMonthsModal
            ? `${debtorMonthsModal.fullName} - qarz oylari`
            : "Qarz oylari"
        }
        open={Boolean(debtorMonthsModal)}
        onCancel={() => setDebtorMonthsModal(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {debtorMonthsModal ? (
          <div className="debtor-months-modal-shell">
            <div className="debtor-months-modal-body">
              {debtorMonthsModal.months.length ? (
                debtorMonthsModal.months.map((item) => (
                  <div key={item.balanceId} className="debtor-months-modal-row">
                    <div className="debtor-months-modal-info">
                      <strong>{item.groupName}</strong>
                      <span>{item.month}</span>
                    </div>
                    <b>{formatMoney(item.debtAmount)}</b>
                  </div>
                ))
              ) : (
                <p className="debtor-months-modal-empty">
                  Qarz oylari topilmadi
                </p>
              )}
            </div>
            <div className="debtor-months-modal-footer">
              <Button type="primary" onClick={() => setDebtorMonthsModal(null)}>
                Yopish
              </Button>
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
          <Button
            key="print"
            type="primary"
            icon={<Printer size={16} />}
            onClick={() => window.print()}
          >
            Chop etish
          </Button>,
        ]}
        width={420}
      >
        {receipt ? (
          <div className="receipt-print-area">
            <div className="receipt-paper">
              <BrandIdentity
                brand={branding?.unify || UNIFY_BRAND}
                variant="receipt"
              />
              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>Chek</span>
                <strong>#{receipt.payment.id.slice(-8).toUpperCase()}</strong>
              </div>
              <div className="receipt-row">
                <span>Sana</span>
                <strong>
                  {dayjs(receipt.payment.paidAt).format("DD.MM.YYYY HH:mm")}
                </strong>
              </div>
              <div className="receipt-row">
                <span>O'quvchi</span>
                <strong>{receipt.studentName}</strong>
              </div>
              {receipt.payment.allocations.length ? (
                <div className="receipt-row">
                  <span>Oy</span>
                  <strong>
                    {receipt.payment.allocations
                      .map((item) => item.month)
                      .join(", ")}
                  </strong>
                </div>
              ) : null}
              <div className="receipt-row">
                <span>Usul</span>
                <strong>{paymentMethodLabels[receipt.payment.method]}</strong>
              </div>
              {receipt.payment.note ? (
                <div className="receipt-row">
                  <span>Izoh</span>
                  <strong>{receipt.payment.note}</strong>
                </div>
              ) : null}
              <div className="receipt-divider" />
              <div className="receipt-row receipt-total">
                <span>To'landi</span>
                <strong>{formatMoney(receipt.payment.amount)}</strong>
              </div>
              <div className="receipt-divider" />
              <p className="receipt-footer">
                {(branding?.unify.receiptFooter || UNIFY_BRAND.receiptFooter) ??
                  "To'lovingiz uchun rahmat"}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
