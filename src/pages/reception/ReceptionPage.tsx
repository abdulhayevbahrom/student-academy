import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import dayjs from "dayjs";
import { Plus, X } from "lucide-react";
import {
  Group,
  Lead,
  LeadPayload,
  WeekDay,
  useCreateLeadMutation,
  useGetGroupsQuery,
  useGetLeadsQuery,
  useGetSubjectsQuery,
} from "../../services/api";
import { formatUzPhone, formatUzPhoneDisplay } from "../../utils/phone";

const dayLabels = new Map<WeekDay, string>([
  ["monday", "Dushanba"],
  ["tuesday", "Seshanba"],
  ["wednesday", "Chorshanba"],
  ["thursday", "Payshanba"],
  ["friday", "Juma"],
  ["saturday", "Shanba"],
  ["sunday", "Yakshanba"],
]);

const fallbackSubjectOptions = [
  { label: "Buxgalteriya", value: "Buxgalteriya" },
  { label: "IT", value: "IT" },
  { label: "Ingliz tili", value: "Ingliz tili" },
  { label: "Matematika", value: "Matematika" },
  { label: "Boshqa", value: "Boshqa" },
];

const sourceOptions = [
  { label: "Instagram", value: "Instagram" },
  { label: "Telegram", value: "Telegram" },
  { label: "Tavsiya", value: "Tavsiya" },
  { label: "Tashqi reklama", value: "Tashqi reklama" },
  { label: "Telefon", value: "Telefon" },
  { label: "Boshqa", value: "Boshqa" },
];

type ReceptionFormValues = LeadPayload;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string; error?: string } })
      .data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

function formatDays(group: Group) {
  return (
    group.lessonDays
      ?.map((day) => dayLabels.get(day))
      .filter(Boolean)
      .join(", ") || "-"
  );
}

function renderGroupOption(group: Group) {
  return (
    <div className="group-select-option">
      <span className="group-option-subject">{group.subject}</span>
      <small className="group-option-time">
        {group.startTime}-{group.endTime}
      </small>
      <small className="group-option-days">{formatDays(group)}</small>
      <small className="group-option-teacher">
        {group.teacher?.fullName || "-"}
      </small>
    </div>
  );
}

export default function ReceptionPage() {
  const [form] = Form.useForm<ReceptionFormValues>();
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);
  const [showClosedGroups, setShowClosedGroups] = useState(false);
  const selectedSubject = Form.useWatch("subject", form);
  const selectedGroupId = Form.useWatch("preferredGroupId", form);
  const { data: groupsResponse, isFetching: isGroupsFetching } =
    useGetGroupsQuery({ limit: 100, status: "active" });
  const { data: leadsResponse, isFetching: isLeadsFetching } = useGetLeadsQuery(
    { limit: 100 },
  );
  const { data: subjectsResponse } = useGetSubjectsQuery();
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const groups = groupsResponse?.data || [];
  const subjectOptions = (
    subjectsResponse?.data.length
      ? subjectsResponse.data
      : fallbackSubjectOptions.map((subject) => subject.value)
  ).map((subject) => ({ label: subject, value: subject }));
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const weekStart = dayjs()
    .startOf("day")
    .subtract(dayjs().day() === 0 ? 6 : dayjs().day() - 1, "day");
  const weeklyLeads =
    leadsResponse?.data.filter(
      (lead) =>
        dayjs(lead.createdAt).isAfter(weekStart) ||
        dayjs(lead.createdAt).isSame(weekStart),
    ) || [];
  const groupOptions = groups
    .filter(
      (group) =>
        (!selectedSubject || group.subject === selectedSubject) &&
        (showClosedGroups || group.isEnrollmentOpen),
    )
    .map((group) => ({
      label: renderGroupOption(group),
      value: group.id,
      title: `${group.name} (${group.subject})`,
    }));

  async function handleSubmit(values: ReceptionFormValues) {
    try {
      await createLead({
        ...values,
        secondaryPhone: showSecondaryPhone ? values.secondaryPhone || "" : "",
        status: "new",
        preferredGroupId: values.preferredGroupId || null,
      }).unwrap();
      message.success("Lead yaratildi");
      form.resetFields();
      setShowSecondaryPhone(false);
      setShowClosedGroups(false);
    } catch (error) {
      message.error(getErrorMessage(error, "Lead yaratib bo‘lmadi"));
    }
  }

  return (
    <section className="page">
      <div className="reception-layout">
        <div className="reception-panel">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="reception-grid">
              <Form.Item
                name="fullName"
                label="F.I.Sh"
                rules={[{ required: true, message: "F.I.Sh kiriting" }]}
              >
                <Input placeholder="Masalan: Sardor Valiyev" />
              </Form.Item>

              <div className="reception-phone-row">
                <Form.Item
                  name="phone"
                  label="Telefon"
                  className="phone-field"
                  normalize={formatUzPhone}
                  rules={[
                    { required: true, message: "Telefon kiriting" },
                    {
                      pattern: /^\+998\d{9}$/,
                      message: "Telefon raqam noto'g'ri kiritilgan",
                    },
                  ]}
                >
                  <Input placeholder="+998 90 123 45 67" maxLength={13} />
                </Form.Item>
                <div className="secondary-phone-action">
                  <Tooltip
                    title={
                      showSecondaryPhone
                        ? "Ikkinchi telefon ko‘rsatilgan"
                        : "Ikkinchi telefon qo‘shtirish"
                    }
                  >
                    <Button
                      icon={<Plus size={17} />}
                      onClick={() => setShowSecondaryPhone(true)}
                      disabled={showSecondaryPhone}
                    />
                  </Tooltip>
                </div>
              </div>
            </div>

            {showSecondaryPhone ? (
              <Form.Item
                name="secondaryPhone"
                label="Ikkinchi telefon"
                normalize={formatUzPhone}
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
                    <Tooltip title="Olib tashlash">
                      <Button
                        type="text"
                        icon={<X size={15} />}
                        onClick={() => setShowSecondaryPhone(false)}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            ) : null}

            <div className="reception-subject-row">
              <Form.Item
                name="subject"
                label="Fan"
                rules={[{ required: true, message: "Fan tanlang" }]}
              >
                <Select
                  options={subjectOptions}
                  onChange={() => form.setFieldValue("preferredGroupId", "")}
                />
              </Form.Item>
              <Form.Item name="source" label="Manba">
                <Select allowClear options={sourceOptions} />
              </Form.Item>
              <Form.Item className="closed-groups-toggle">
                <Space>
                  <Switch
                    checked={showClosedGroups}
                    onChange={setShowClosedGroups}
                  />
                  <span>Yopiq guruhlarni ham ko'rsatish</span>
                </Space>
              </Form.Item>
            </div>

            <Form.Item name="preferredGroupId" label="Mos guruh">
              <Select
                allowClear
                showSearch
                optionFilterProp="title"
                loading={isGroupsFetching}
                options={groupOptions}
                optionLabelProp="title"
                notFoundContent="Bu fan bo'yicha mos guruh yo'q"
              />
            </Form.Item>

            {selectedGroup ? (
              <Alert
                className="page-alert"
                type={selectedGroup.isEnrollmentOpen ? "info" : "warning"}
                message={`${selectedGroup.name}: ${selectedGroup.startTime}-${selectedGroup.endTime}, ${formatDays(selectedGroup)}, ${selectedGroup.teacher?.fullName || "-"}`}
                showIcon
              />
            ) : null}

            <div className="reception-grid">
              <Form.Item name="parentName" label="Ota-ona F.I.Sh">
                <Input placeholder="Masalan: Vali Valiyev" />
              </Form.Item>
              <Form.Item
                name="parentPhone"
                label="Ota-ona telefoni"
                normalize={formatUzPhone}
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

            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={4} maxLength={500} showCount />
            </Form.Item>

            <div className="drawer-form-actions">
              <Button htmlType="button" onClick={() => form.resetFields()}>
                Tozalash
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                Lead yaratish
              </Button>
            </div>
          </Form>
        </div>
        <div className="reception-panel reception-list-panel">
          <div className="panel-title-row">
            <div>
              <strong>Shu hafta kelgan leadlar</strong>
              <span>{weeklyLeads.length} ta lead</span>
            </div>
          </div>
          <Table
            rowKey="id"
            size="small"
            loading={isLeadsFetching}
            dataSource={weeklyLeads}
            pagination={false}
            scroll={{ x: 560 }}
            columns={[
              { title: "F.I.Sh", dataIndex: "fullName", ellipsis: true },
              {
                title: "Telefon",
                dataIndex: "phone",
                width: 145,
                render: (value: string) => formatUzPhoneDisplay(value),
              },
              {
                title: "Fan",
                dataIndex: "subject",
                width: 120,
                ellipsis: true,
              },
              {
                title: "Holat",
                dataIndex: "status",
                width: 92,
                render: (_value, record: Lead) =>
                  record.status === "converted" ? (
                    <Tag color="green">Student</Tag>
                  ) : (
                    <Tag color="blue">Lead</Tag>
                  ),
              },
            ]}
          />

          <div className="reception-leads-mobile">
            {weeklyLeads.map((lead) => (
              <div key={lead.id} className="reception-leads-mobile-card">
                <div className="reception-leads-mobile-row">
                  <strong>{lead.fullName}</strong>
                  <Tag color={lead.status === "converted" ? "green" : "blue"}>
                    {lead.status === "converted" ? "Student" : "Lead"}
                  </Tag>
                </div>
                <div className="reception-leads-mobile-row">
                  <span>{formatUzPhoneDisplay(lead.phone)}</span>
                  <span className="reception-leads-mobile-subject">
                    {lead.subject || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
