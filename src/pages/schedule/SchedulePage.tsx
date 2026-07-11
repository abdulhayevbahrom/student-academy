import { CSSProperties, Fragment, useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Segmented, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { CalendarDays, Clock3, DoorOpen, RotateCcw, Search } from 'lucide-react';
import { Group, WeekDay, useGetGroupsQuery, useGetRoomsQuery } from '../../services/api';

const dayOptions: { label: string; shortLabel: string; value: WeekDay }[] = [
  { label: 'Dushanba', shortLabel: 'D', value: 'monday' },
  { label: 'Seshanba', shortLabel: 'S', value: 'tuesday' },
  { label: 'Chorshanba', shortLabel: 'CH', value: 'wednesday' },
  { label: 'Payshanba', shortLabel: 'P', value: 'thursday' },
  { label: 'Juma', shortLabel: 'J', value: 'friday' },
  { label: 'Shanba', shortLabel: 'SH', value: 'saturday' },
];

const oddDays: WeekDay[] = ['monday', 'wednesday', 'friday'];
const evenDays: WeekDay[] = ['tuesday', 'thursday', 'saturday'];
const scheduleStartHour = 8;
const scheduleEndHour = 20;
const lessonBlockHours = 2;
const timelineStepMinutes = 30;

type DayFilter = 'all' | 'odd' | 'even';
type ScheduleView = 'days' | 'rooms';

type ScheduleSlot = {
  day: WeekDay;
  group: Group;
  time: string;
};

type GroupedScheduleSlot = Omit<ScheduleSlot, 'day'> & {
  days: WeekDay[];
};

function getDayLabel(day: WeekDay) {
  return dayOptions.find((item) => item.value === day)?.label || day;
}

function getShortDayLabel(day: WeekDay) {
  return dayOptions.find((item) => item.value === day)?.shortLabel || day;
}

function formatLessonTime(group: Group) {
  if (!group.startTime || !group.endTime) return '-';

  return `${group.startTime}-${group.endTime}`;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function getScheduleTimes() {
  return Array.from({ length: (scheduleEndHour - scheduleStartHour) / lessonBlockHours }, (_item, index) => {
    const hour = scheduleStartHour + index * lessonBlockHours;

    return `${formatHour(hour)}-${formatHour(hour + lessonBlockHours)}`;
  });
}

function getTimelineTimes() {
  const startMinutes = scheduleStartHour * 60;
  const endMinutes = scheduleEndHour * 60;
  const totalSteps = (endMinutes - startMinutes) / timelineStepMinutes;

  return Array.from({ length: totalSteps + 1 }, (_item, index) => {
    const minutes = startMinutes + index * timelineStepMinutes;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });
}

function getMinutesFromTime(value?: string) {
  const [hour = '', minute = ''] = value?.split(':') || [];
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);

  if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return null;

  return parsedHour * 60 + parsedMinute;
}

function getStartMinutesFromRange(value: string) {
  return getMinutesFromTime(value.split('-')[0]) || 0;
}

function getTimelineColumn(group: Group) {
  const startMinutes = getMinutesFromTime(group.startTime);
  const endMinutes = getMinutesFromTime(group.endTime);
  const minMinutes = scheduleStartHour * 60;
  const maxMinutes = scheduleEndHour * 60;

  if (startMinutes === null || endMinutes === null) return '1 / 2';

  const clampedStart = Math.max(startMinutes, minMinutes);
  const clampedEnd = Math.min(endMinutes, maxMinutes);
  const startLine = Math.floor((clampedStart - minMinutes) / timelineStepMinutes) + 1;
  const endLine = Math.ceil((clampedEnd - minMinutes) / timelineStepMinutes) + 1;

  return `${startLine} / ${Math.max(endLine, startLine + 1)}`;
}

function getTimeBlocksForGroup(group: Group) {
  const startMinutes = getMinutesFromTime(group.startTime);
  const endMinutes = getMinutesFromTime(group.endTime);

  if (startMinutes === null || endMinutes === null) return [];

  const minMinutes = scheduleStartHour * 60;
  const maxMinutes = scheduleEndHour * 60;

  if (startMinutes < minMinutes || endMinutes > maxMinutes) return [];

  return [formatLessonTime(group)];
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getActiveDays(dayFilter: DayFilter, selectedDays: WeekDay[]) {
  if (selectedDays.length) return selectedDays;
  if (dayFilter === 'odd') return oddDays;
  if (dayFilter === 'even') return evenDays;

  return dayOptions.map((day) => day.value);
}

function hasSchedule(group: Group) {
  return group.lessonDays?.length && group.startTime && group.endTime;
}

function groupMatchesSearch(group: Group, search: string) {
  if (!search) return true;

  return [
    group.name,
    group.subject,
    group.teacher?.fullName,
    group.room,
    formatLessonTime(group),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
}

function ScheduleLessonCard({ day, days, group, style }: ScheduleSlot & { days?: WeekDay[]; style?: CSSProperties }) {
  const lessonDays = days || [day];

  return (
    <div className="schedule-lesson" style={style}>
      <div className="schedule-lesson-title">
        <strong>{group.name}</strong>
        <div className="schedule-lesson-days">
          {lessonDays.map((lessonDay) => (
            <Tag key={lessonDay}>{getShortDayLabel(lessonDay)}</Tag>
          ))}
        </div>
      </div>
      <span>{group.subject}</span>
      <small>{group.teacher?.fullName || "O'qituvchi biriktirilmagan"}</small>
      <small>{formatLessonTime(group)}</small>
      <div className="schedule-lesson-meta">
        <Tag color="blue">{group.room || 'Xona yoq'}</Tag>
        <Tag color="green">{lessonDays.map(getDayLabel).join(', ')}</Tag>
      </div>
    </div>
  );
}

function groupSlotsByGroup(slots: ScheduleSlot[]) {
  const map = new Map<string, GroupedScheduleSlot>();

  slots.forEach((slot) => {
    const key = `${slot.group.id}-${slot.time}`;
    const existing = map.get(key);

    if (existing) {
      existing.days = [...existing.days, slot.day];
      return;
    }

    map.set(key, { group: slot.group, time: slot.time, days: [slot.day] });
  });

  return Array.from(map.values());
}

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>('days');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>();
  const [search, setSearch] = useState('');

  const { data, isError, isFetching } = useGetGroupsQuery({ status: 'active', limit: 500 });
  const { data: roomsResponse } = useGetRoomsQuery();
  const groups = data?.data || [];

  const rooms = useMemo(
    () => Array.from(new Set([...(roomsResponse?.data || []), ...groups.map((group) => group.room).filter(Boolean)]))
      .sort((a, b) => a.localeCompare(b)),
    [groups, roomsResponse?.data],
  );

  const activeDays = useMemo(() => getActiveDays(dayFilter, selectedDays), [dayFilter, selectedDays]);

  const scheduleSlots = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return groups
      .filter(hasSchedule)
      .filter((group) => !selectedRoom || group.room === selectedRoom)
      .filter((group) => groupMatchesSearch(group, normalizedSearch))
      .flatMap((group) =>
        group.lessonDays
          .filter((day) => activeDays.includes(day))
          .flatMap((day) => getTimeBlocksForGroup(group).map((time) => ({ day, group, time }))),
      )
      .sort((a, b) => {
        const timeCompare = a.group.startTime.localeCompare(b.group.startTime);
        if (timeCompare !== 0) return timeCompare;

        return a.group.name.localeCompare(b.group.name);
      });
  }, [activeDays, groups, search, selectedRoom]);

  const times = useMemo(
    () => Array.from(new Set([...getScheduleTimes(), ...scheduleSlots.map((slot) => slot.time)]))
      .sort((a, b) => getStartMinutesFromRange(a) - getStartMinutesFromRange(b)),
    [scheduleSlots],
  );
  const timelineTimes = useMemo(getTimelineTimes, []);

  const slotsByDayAndTime = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();

    scheduleSlots.forEach((slot) => {
      const key = `${slot.day}-${slot.time}`;
      map.set(key, [...(map.get(key) || []), slot]);
    });

    return map;
  }, [scheduleSlots]);

  const visibleRooms = useMemo(
    () => (selectedRoom ? [selectedRoom] : rooms),
    [rooms, selectedRoom],
  );

  const slotsByRoom = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();

    scheduleSlots.forEach((slot) => {
      const room = slot.group.room || 'Xona yoq';
      map.set(room, [...(map.get(room) || []), slot]);
    });

    return map;
  }, [scheduleSlots]);

  function resetFilters() {
    setDayFilter('all');
    setSelectedDays([]);
    setSelectedRoom(undefined);
    setSearch('');
  }

  function handleDayFilterChange(nextFilter: DayFilter) {
    setDayFilter(nextFilter);
    setSelectedDays([]);
  }

  const visibleDays = dayOptions.filter((day) => activeDays.includes(day.value));

  return (
    <div className="page schedule-page">
      <div className="page-header">
        <div>
          <Typography.Title level={2}>Dars jadvali</Typography.Title>
          <Typography.Text className="page-description">
            Xona, hafta kuni va toq yoki juft kunlar bo'yicha dars vaqtlarini ko'ring.
          </Typography.Text>
        </div>
      </div>

      {isError ? (
        <Alert className="page-alert" type="error" showIcon message="Dars jadvalini yuklashda xatolik yuz berdi" />
      ) : null}

      <div className="schedule-toolbar">
        <Input
          allowClear
          prefix={<Search size={16} />}
          placeholder="Guruh, fan, o'qituvchi yoki xona qidirish"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          allowClear
          placeholder="Xona"
          value={selectedRoom}
          options={rooms.map((room) => ({ label: room, value: room }))}
          onChange={setSelectedRoom}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Hafta kunlari"
          value={selectedDays}
          options={dayOptions.map(({ label, value }) => ({ label, value }))}
          onChange={setSelectedDays}
        />
        <Space.Compact className="schedule-day-switch">
          <Button type={dayFilter === 'all' && !selectedDays.length ? 'primary' : 'default'} onClick={() => handleDayFilterChange('all')}>
            Hammasi
          </Button>
          <Button type={dayFilter === 'odd' && !selectedDays.length ? 'primary' : 'default'} onClick={() => handleDayFilterChange('odd')}>
            Toq kunlar
          </Button>
          <Button type={dayFilter === 'even' && !selectedDays.length ? 'primary' : 'default'} onClick={() => handleDayFilterChange('even')}>
            Juft kunlar
          </Button>
        </Space.Compact>
        <Tooltip title="Filtrlarni tozalash">
          <Button icon={<RotateCcw size={16} />} onClick={resetFilters} />
        </Tooltip>
      </div>

      <Segmented
        className="schedule-view-switch"
        value={view}
        options={[
          { label: "Kunlar bo'yicha", value: 'days' },
          { label: "Xonalar bo'yicha", value: 'rooms' },
        ]}
        onChange={(value) => setView(value as ScheduleView)}
      />

      <div className="schedule-summary">
        <div>
          <CalendarDays size={17} />
          <span>{visibleDays.map((day) => day.shortLabel).join(', ')}</span>
        </div>
        <div>
          <DoorOpen size={17} />
          <span>{selectedRoom || 'Barcha xonalar'}</span>
        </div>
        <div>
          <Clock3 size={17} />
          <span>08:00-20:00 oralig'i</span>
        </div>
      </div>

      {view === 'days' && visibleDays.length ? (
        <div className="schedule-grid-wrap">
          <div className="schedule-grid" style={{ gridTemplateColumns: `112px repeat(${visibleDays.length}, minmax(190px, 1fr))` }}>
            <div className="schedule-grid-head schedule-time-head">Vaqt</div>
            {visibleDays.map((day) => (
              <div className="schedule-grid-head" key={day.value}>
                <span>{day.label}</span>
                <small>{day.shortLabel}</small>
              </div>
            ))}

            {times.map((time) => (
              <Fragment key={time}>
                <div className="schedule-time-cell" key={`${time}-label`}>{time}</div>
                {visibleDays.map((day) => {
                  const slots = slotsByDayAndTime.get(`${day.value}-${time}`) || [];

                  return (
                    <div className="schedule-day-cell" key={`${day.value}-${time}`}>
                      {slots.length ? (
                        slots.map(({ group }) => (
                          <ScheduleLessonCard day={day.value} group={group} time={time} key={`${group.id}-${day.value}`} />
                        ))
                      ) : (
                        <span className="schedule-empty-slot">-</span>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}

      {view === 'rooms' && visibleRooms.length ? (
        <div className="schedule-grid-wrap">
          <div className="schedule-room-grid">
            <div className="schedule-grid-head schedule-time-head schedule-room-head">Xona</div>
            <div className="schedule-room-timeline-head">
              {timelineTimes.map((time) => (
                <span key={time}>{time}</span>
              ))}
            </div>

            {visibleRooms.map((room) => (
              <Fragment key={room}>
                <div className="schedule-time-cell schedule-room-label">{room}</div>
                <div className="schedule-room-timeline">
                  {groupSlotsByGroup(slotsByRoom.get(room) || []).map((slot) => (
                    <ScheduleLessonCard
                      day={slot.days[0]}
                      days={slot.days}
                      group={slot.group}
                      time={slot.time}
                      key={`${slot.group.id}-${slot.time}`}
                      style={{ gridColumn: getTimelineColumn(slot.group) }}
                    />
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}

      {(view === 'days' && !visibleDays.length) || (view === 'rooms' && !visibleRooms.length) ? (
        <div className="page-placeholder">
          <Empty description={isFetching ? 'Jadval yuklanmoqda...' : "Bu filtrlar bo'yicha dars topilmadi"} />
        </div>
      ) : null}
    </div>
  );
}
