import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { formatUzPhoneDisplay } from "../../utils/phone";
import dayjs, { Dayjs } from "dayjs";
import type { AppDispatch } from "../../app/store";
import {
  CheckCheck,
  Clock3,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserX,
  X,
} from "lucide-react";
import {
  api,
  AttendanceEntry,
  AttendanceEntryStatus,
  AttendancePayload,
  AttendanceStatus,
  Group,
  useLazyGetAttendanceMonthQuery,
  useGetAttendanceQuery,
  useGetGroupsQuery,
  useSaveAttendanceMutation,
} from "../../services/api";

type LocalAttendanceRow = {
  studentId: string;
  fullName: string;
  phone: string;
  status: AttendanceEntryStatus;
  note: string;
};

type HistoryAttendanceRow = {
  studentId: string;
  studentName: string;
  phone: string;
  records: Record<number, AttendanceEntryStatus>;
  summary: Record<AttendanceStatus | "total", number>;
};

const statusOptions: { label: string; value: AttendanceStatus }[] = [
  { label: "Keldi", value: "present" },
  { label: "Kelmadi", value: "absent" },
  { label: "Kechikdi", value: "late" },
  { label: "Sababli", value: "excused" },
];

const statusMeta: Record<
  AttendanceEntryStatus,
  { label: string; color: string }
> = {
  present: { label: "Keldi", color: "green" },
  absent: { label: "Kelmadi", color: "red" },
  late: { label: "Kechikdi", color: "gold" },
  excused: { label: "Sababli", color: "blue" },
  unmarked: { label: "Belgilanmagan", color: "default" },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string; error?: string } })
      .data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

function toLocalRows(entries: AttendanceEntry[]): LocalAttendanceRow[] {
  return entries.map((entry) => ({
    studentId: entry.student.id,
    fullName: entry.student.fullName,
    phone: entry.student.phone,
    status: entry.status,
    note: entry.note || "",
  }));
}

function formatGroupLabel(group: Group) {
  const teacherName = group.teacher?.fullName
    ? ` • ${group.teacher.fullName}`
    : "";
  return `${group.name} • ${group.subject}${teacherName}`;
}

function disableFutureDates(current: Dayjs) {
  return current.isAfter(dayjs(), "day");
}

export default function AttendancePage() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LocalAttendanceRow[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  // Monthly stats
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [monthlyStats, setMonthlyStats] = useState<{
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  }>({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // History tab state
  const [historyGroupId, setHistoryGroupId] = useState<string>();
  const [historyMonth, setHistoryMonth] = useState<Dayjs>(dayjs());
  const [historySearch, setHistorySearch] = useState("");
  const [historyData, setHistoryData] = useState<HistoryAttendanceRow[]>([]);
  const [selectedHistoryStudent, setSelectedHistoryStudent] =
    useState<HistoryAttendanceRow | null>(null);

  const dateValue = selectedDate.format("YYYY-MM-DD");
  const { data: groupsResponse, isFetching: isGroupsFetching } =
    useGetGroupsQuery({ status: "active", limit: 100 });
  const {
    data: attendance,
    isFetching: isAttendanceFetching,
    isError,
  } = useGetAttendanceQuery(
    { groupId: selectedGroupId || "", date: dateValue },
    { skip: !selectedGroupId },
  );
  const [saveAttendance, { isLoading: isSaving }] = useSaveAttendanceMutation();
  const [getAttendanceMonth, { isFetching: isHistoryFetching }] =
    useLazyGetAttendanceMonthQuery();

  const groups = groupsResponse?.data || [];
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || attendance?.group;
  const dailyCardView = viewportWidth <= 768;
  const historyCardView = viewportWidth <= 768;
  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return rows;

    return rows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(value) ||
        row.phone.toLowerCase().includes(value),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    const result = {
      total: rows.length,
      present: rows.filter((row) => row.status === "present").length,
      absent: rows.filter((row) => row.status === "absent").length,
      late: rows.filter((row) => row.status === "late").length,
    };

    return result;
  }, [rows]);

  function updateRow(studentId: string, updates: Partial<LocalAttendanceRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, ...updates } : row,
      ),
    );
  }

  function markAll(status: AttendanceStatus) {
    const allUnmarked = rows.every((row) => row.status === "unmarked");

    if (!allUnmarked) {
      setRows((prev) => prev.map((row) => ({ ...row, status: "unmarked" })));
      return;
    }

    setRows((prev) => prev.map((row) => ({ ...row, status })));
  }

  function updateRowStatus(studentId: string, status: AttendanceStatus) {
    const row = rows.find((r) => r.studentId === studentId);

    if (!row) return;

    const newStatus = row.status === status ? "unmarked" : status;

    updateRow(studentId, { status: newStatus });
  }

  useEffect(() => {
    if (attendance?.entries) {
      setRows(toLocalRows(attendance.entries));
    } else {
      setRows([]);
    }
  }, [attendance]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function toggleMobileFilters() {
    setMobileFiltersOpen((prev) => !prev);
  }

  function clearDailyFilters() {
    setSearch("");
    setMobileFiltersOpen(false);
  }

  function renderDailyStatusButtons(record: LocalAttendanceRow) {
    const statusButtons: Array<{
      value: AttendanceStatus;
      label: string;
      icon: JSX.Element;
    }> = [
      { value: "present", label: "Keldi", icon: <CheckCheck size={16} /> },
      { value: "absent", label: "Kelmadi", icon: <UserX size={16} /> },
      { value: "late", label: "Kechikdi", icon: <Clock3 size={16} /> },
      { value: "excused", label: "Sababli", icon: <ShieldCheck size={16} /> },
    ];

    return (
      <div className="attendance-mobile-status-grid">
        {statusButtons.map((option) => {
          const isActive = record.status === option.value;

          return (
            <Button
              key={option.value}
              size="small"
              className={`attendance-status-action attendance-status-action-${option.value} ${isActive ? "is-active" : ""}`}
              icon={option.icon}
              type={isActive ? "primary" : "default"}
              aria-label={option.label}
              title={option.label}
              onClick={() => updateRowStatus(record.studentId, option.value)}
            >
              1
            </Button>
          );
        })}
      </div>
    );
  }

  function renderDailyCard(record: LocalAttendanceRow) {
    return (
      <article className="attendance-mobile-card" key={record.studentId}>
        <div className="attendance-mobile-card-header">
          <div className="attendance-mobile-student">
            <strong>{record.fullName}</strong>
            <span>{formatUzPhoneDisplay(record.phone)}</span>
          </div>
          <Tag color={statusMeta[record.status].color}>
            {statusMeta[record.status].label}
          </Tag>
        </div>

        {renderDailyStatusButtons(record)}

        {record.status === "excused" ? (
          <Input
            value={record.note}
            placeholder="Sabab"
            maxLength={300}
            onChange={(event) =>
              updateRow(record.studentId, { note: event.target.value })
            }
          />
        ) : null}
      </article>
    );
  }

  function renderHistoryCard(student: HistoryAttendanceRow) {
    const daysInMonth = historyMonth.daysInMonth();
    const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const status = student.records[day];

      return (
        <div
          key={day}
          className={`attendance-history-day-cell ${status ? `is-${status}` : "is-empty"}`}
        >
          <span>{day}</span>
          <b />
        </div>
      );
    });

    return (
      <article
        className="attendance-history-mobile-card"
        key={student.studentId}
      >
        <div className="attendance-mobile-card-header">
          <div className="attendance-mobile-student">
            <strong>{student.studentName}</strong>
            <span>{formatUzPhoneDisplay(student.phone)}</span>
          </div>
          <Button
            size="small"
            onClick={() => setSelectedHistoryStudent(student)}
          >
            Batafsil
          </Button>
        </div>

        <div className="attendance-history-mobile-grid">{dayCells}</div>

        <div className="attendance-history-mobile-summary">
          <Tag color="green">Keldi: {student.summary.present}</Tag>
          <Tag color="red">Kelmadi: {student.summary.absent}</Tag>
          <Tag color="gold">Kechikdi: {student.summary.late}</Tag>
          <Tag color="blue">Sababli: {student.summary.excused}</Tag>
        </div>
      </article>
    );
  }

  async function getAttendanceByDate(groupId: string, date: string) {
    const request = dispatch(
      api.endpoints.getAttendance.initiate(
        { groupId, date },
        { forceRefetch: true, subscribe: false },
      ),
    );

    return request.unwrap();
  }

  async function handleSave() {
    if (!selectedGroupId) {
      message.warning("Avval guruh tanlang");
      return;
    }

    const unmarkedCount = rows.filter(
      (row) => row.status === "unmarked",
    ).length;

    if (unmarkedCount) {
      message.warning(`${unmarkedCount} ta o'quvchi belgilanmagan`);
      return;
    }

    const payload: AttendancePayload = {
      groupId: selectedGroupId,
      date: dateValue,
      records: rows.map((row) => ({
        studentId: row.studentId,
        status: row.status as AttendanceStatus,
        note: row.note,
      })),
    };

    try {
      const saved = await saveAttendance(payload).unwrap();
      setRows(toLocalRows(saved.entries));
      message.success("Davomat saqlandi");
    } catch (error) {
      message.error(getErrorMessage(error, "Davomatni saqlab bo'lmadi"));
    }
  }

  async function fetchMonthlyStats() {
    if (!selectedGroupId || !selectedStudentId) {
      message.warning("Guruh va o'quvchini tanlang");
      return;
    }

    setMonthlyLoading(true);
    const daysInMonth = selectedMonth.daysInMonth();
    const monthStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

    try {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = selectedMonth.date(day).format("YYYY-MM-DD");
        try {
          const data = await getAttendanceByDate(selectedGroupId, dateStr);

          if (data?.entries) {
            const entry = data.entries.find(
              (entry) => entry.student.id === selectedStudentId,
            );
            if (entry) {
              monthStats.total += 1;
              if (entry.status === "present") monthStats.present += 1;
              else if (entry.status === "absent") monthStats.absent += 1;
              else if (entry.status === "late") monthStats.late += 1;
              else if (entry.status === "excused") monthStats.excused += 1;
            }
          }
        } catch {
          // Silent error for individual days
        }
      }

      setMonthlyStats(monthStats);
      message.success("Statistika hisoblandi");
    } catch (error) {
      message.error("Statistika hisoblashda xato");
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function fetchHistoryData() {
    if (!historyGroupId) {
      message.warning("Guruh tanlang");
      return;
    }

    try {
      const response = await getAttendanceMonth({
        groupId: historyGroupId,
        month: historyMonth.format("YYYY-MM"),
      }).unwrap();

      setHistoryData(
        response.students.map((item) => {
          const records = Object.fromEntries(
            Object.entries(item.records).map(([day, record]) => [
              Number(day),
              record.status,
            ]),
          ) as Record<number, AttendanceEntryStatus>;

          return {
            studentId: item.student.id,
            studentName: item.student.fullName,
            phone: item.student.phone,
            records,
            summary: item.summary,
          };
        }),
      );
      message.success("Tarix yuklandi");
    } catch (error) {
      message.error("Tarix yuklab bo'lmadi");
    }
  }

  return (
    <section className="page attendance-page">
      <Tabs
        items={[
          {
            key: "daily",
            label: "Kunlik davomat",
            children: (
              <>
                {isError ? (
                  <Alert
                    className="page-alert"
                    type="error"
                    message="Davomat ma'lumotini yuklab bo'lmadi."
                    showIcon
                  />
                ) : null}

                <div className="filter-bar attendance-filter-bar attendance-history-filter-bar attendance-daily-filter-bar">
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Guruh tanlang"
                    loading={isGroupsFetching}
                    value={selectedGroupId}
                    options={groups.map((group) => ({
                      label: formatGroupLabel(group),
                      value: group.id,
                    }))}
                    onChange={setSelectedGroupId}
                  />
                  <DatePicker
                    className="full-width"
                    value={selectedDate}
                    format="DD.MM.YYYY"
                    disabledDate={disableFutureDates}
                    onChange={(value) => setSelectedDate(value || dayjs())}
                  />
                  <div className="attendance-search-filter-group">
                    <Input
                      allowClear
                      prefix={<Search size={16} />}
                      placeholder="O'quvchi qidirish"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <div
                    className={`attendance-filter-extra ${mobileFiltersOpen ? "is-open" : ""}`}
                  >
                    <div className="attendance-mark-buttons">
                      <Button
                        className="attendance-mark-all-button attendance-mark-all-button-present"
                        icon={<CheckCheck size={16} />}
                        onClick={() => markAll("present")}
                        disabled={!rows.length}
                      >
                        Hammasi keldi
                      </Button>
                      <Button
                        className="attendance-mark-all-button attendance-mark-all-button-absent"
                        icon={<X size={16} />}
                        onClick={() => markAll("absent")}
                        disabled={!rows.length}
                      >
                        Hammasi kelmadi
                      </Button>
                    </div>
                    <Button
                      type="primary"
                      icon={<Save size={16} />}
                      loading={isSaving}
                      onClick={handleSave}
                      disabled={!rows.length}
                    >
                      Saqlash
                    </Button>
                  </div>
                </div>

                <div className="attendance-summary">
                  <div className="payments-stat attendance-stat">
                    <div className="payments-stat-header">
                      <span>Jami</span>
                      <ShieldCheck size={18} />
                    </div>
                    <strong>{summary.total}</strong>
                  </div>
                  <div className="payments-stat attendance-stat">
                    <div className="payments-stat-header">
                      <span>Keldi</span>
                      <CheckCheck size={18} />
                    </div>
                    <strong>{summary.present}</strong>
                  </div>
                  <div className="payments-stat attendance-stat">
                    <div className="payments-stat-header">
                      <span>Kelmadi</span>
                      <UserX size={18} />
                    </div>
                    <strong>{summary.absent}</strong>
                  </div>
                  <div className="payments-stat attendance-stat">
                    <div className="payments-stat-header">
                      <span>Kechikdi</span>
                      <Clock3 size={18} />
                    </div>
                    <strong>{summary.late}</strong>
                  </div>
                </div>

                {dailyCardView ? (
                  <div className="attendance-mobile-list">
                    {filteredRows.length ? (
                      filteredRows.map(renderDailyCard)
                    ) : (
                      <Empty
                        description={
                          selectedGroupId
                            ? "Bu guruhda faol o'quvchi yo'q"
                            : "Guruh tanlang"
                        }
                      />
                    )}
                  </div>
                ) : (
                  <Table
                    className="attendance-table"
                    rowKey="studentId"
                    size="small"
                    loading={isAttendanceFetching}
                    dataSource={filteredRows}
                    locale={{
                      emptyText: selectedGroupId ? (
                        <Empty description="Bu guruhda faol o'quvchi yo'q" />
                      ) : (
                        <Empty description="Guruh tanlang" />
                      ),
                    }}
                    pagination={false}
                    columns={[
                      {
                        title: "O'quvchi",
                        dataIndex: "fullName",
                        width: 260,
                        render: (value, record) => (
                          <div className="attendance-student-cell">
                            <strong>{value}</strong>
                            <span>{formatUzPhoneDisplay(record.phone)}</span>
                          </div>
                        ),
                      },
                      {
                        title: "Holat",
                        dataIndex: "status",
                        width: 340,
                        render: (value: AttendanceEntryStatus, record) => (
                          <Space className="attendance-status-cell">
                            <Tag color={statusMeta[value].color}>
                              {statusMeta[value].label}
                            </Tag>
                            <Segmented
                              size="small"
                              value={value === "unmarked" ? undefined : value}
                              options={statusOptions}
                              onChange={(status) =>
                                updateRow(record.studentId, {
                                  status: status as AttendanceStatus,
                                })
                              }
                            />
                          </Space>
                        ),
                      },
                      {
                        title: "Izoh",
                        dataIndex: "note",
                        render: (value: string, record) => (
                          <Input
                            value={value}
                            placeholder="Izoh"
                            maxLength={300}
                            onChange={(event) =>
                              updateRow(record.studentId, {
                                note: event.target.value,
                              })
                            }
                          />
                        ),
                      },
                    ]}
                  />
                )}

                {selectedGroup ? (
                  <Typography.Text className="muted-text attendance-footer-note">
                    {selectedGroup.name} • {selectedGroup.startTime}-
                    {selectedGroup.endTime} •{" "}
                    {dayjs(dateValue).format("DD.MM.YYYY")}
                  </Typography.Text>
                ) : null}
              </>
            ),
          },
          {
            key: "history",
            label: "Tarix",
            children: (
              <>
                <div className="filter-bar attendance-filter-bar">
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Guruh tanlang"
                    loading={isGroupsFetching}
                    value={historyGroupId}
                    options={groups.map((group) => ({
                      label: formatGroupLabel(group),
                      value: group.id,
                    }))}
                    onChange={setHistoryGroupId}
                  />
                  <DatePicker
                    picker="month"
                    value={historyMonth}
                    format="MMMM YYYY"
                    onChange={(value) => setHistoryMonth(value || dayjs())}
                  />
                  <Button
                    type="primary"
                    onClick={fetchHistoryData}
                    disabled={!historyGroupId}
                    loading={isHistoryFetching}
                    style={{ marginBottom: 0 }}
                  >
                    Tarix yuklash
                  </Button>
                </div>

                {historyData.length > 0 ? (
                  <>
                    <Input
                      className="attendance-history-search"
                      placeholder="O'quvchi ismi bo'yicha qidirish"
                      prefix={<Search size={14} />}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.currentTarget.value)}
                      style={{ marginBottom: 16 }}
                    />

                    {historyCardView ? (
                      <div className="attendance-history-mobile-list">
                        {historyData
                          .filter((student) =>
                            student.studentName
                              .toLowerCase()
                              .includes(historySearch.toLowerCase()),
                          )
                          .map(renderHistoryCard)}
                      </div>
                    ) : (
                      <Table
                        className="attendance-history-table"
                        dataSource={historyData.filter((student) =>
                          student.studentName
                            .toLowerCase()
                            .includes(historySearch.toLowerCase()),
                        )}
                        rowKey="studentId"
                        size="small"
                        loading={isHistoryFetching}
                        pagination={{ pageSize: 15 }}
                        scroll={{
                          x: 190 + historyMonth.daysInMonth() * 44 + 350,
                        }}
                        tableLayout="fixed"
                        columns={[
                          {
                            title: "O'quvchi",
                            width: 190,
                            render: (_, record) => (
                              <div className="attendance-student-cell">
                                <span style={{ fontWeight: 600 }}>
                                  {record.studentName}
                                </span>
                                <span>
                                  {formatUzPhoneDisplay(record.phone)}
                                </span>
                              </div>
                            ),
                          },
                          ...Array.from(
                            { length: historyMonth.daysInMonth() },
                            (_, i) => ({
                              title: (i + 1).toString(),
                              width: 44,
                              align: "center" as const,
                              render: (_: any, record: any) => {
                                const status = record.records[i + 1];
                                if (!status)
                                  return (
                                    <span
                                      style={{ color: "var(--color-muted)" }}
                                    >
                                      -
                                    </span>
                                  );
                                const meta = statusMeta[status];
                                return (
                                  <Tag
                                    aria-label={meta.label}
                                    className={`attendance-status-marker attendance-status-marker-${status}`}
                                  />
                                );
                              },
                            }),
                          ),
                          {
                            title: "Keldi",
                            width: 80,
                            align: "center" as const,
                            render: (_, record) => (
                              <Tag color="green">{record.summary.present}</Tag>
                            ),
                          },
                          {
                            title: "Kelmadi",
                            width: 90,
                            align: "center" as const,
                            render: (_, record) => (
                              <Tag color="red">{record.summary.absent}</Tag>
                            ),
                          },
                          {
                            title: "Kechikdi",
                            width: 90,
                            align: "center" as const,
                            render: (_, record) => (
                              <Tag color="gold">{record.summary.late}</Tag>
                            ),
                          },
                          {
                            title: "Sababli",
                            width: 90,
                            align: "center" as const,
                            render: (_, record) => (
                              <Tag color="blue">{record.summary.excused}</Tag>
                            ),
                          },
                        ]}
                      />
                    )}
                  </>
                ) : historyGroupId ? (
                  <Empty description="Tarix ma'lumoti topilmadi" />
                ) : (
                  <Empty description="Guruh va oyni tanlang" />
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={
          selectedHistoryStudent
            ? `${selectedHistoryStudent.studentName} - davomat tafsiloti`
            : "Davomat tafsiloti"
        }
        open={Boolean(selectedHistoryStudent)}
        onCancel={() => setSelectedHistoryStudent(null)}
        footer={null}
        width={760}
      >
        {selectedHistoryStudent ? (
          <div className="attendance-history-detail-modal">
            <div className="attendance-history-mobile-summary">
              <Tag color="green">
                Keldi: {selectedHistoryStudent.summary.present}
              </Tag>
              <Tag color="red">
                Kelmadi: {selectedHistoryStudent.summary.absent}
              </Tag>
              <Tag color="gold">
                Kechikdi: {selectedHistoryStudent.summary.late}
              </Tag>
              <Tag color="blue">
                Sababli: {selectedHistoryStudent.summary.excused}
              </Tag>
            </div>
            <div className="attendance-history-mobile-grid">
              {Array.from(
                { length: historyMonth.daysInMonth() },
                (_, index) => {
                  const day = index + 1;
                  const status = selectedHistoryStudent.records[day];

                  return (
                    <div
                      key={day}
                      className={`attendance-history-day-cell ${status ? `is-${status}` : "is-empty"}`}
                    >
                      <span>{day}</span>
                      <b />
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
