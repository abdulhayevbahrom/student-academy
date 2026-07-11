import { DatePicker, Empty, Progress, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useGetCourseStudentReportQuery, useGetStudentSourceReportQuery } from '../../services/api';

const { RangePicker } = DatePicker;

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString('uz-UZ');
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    function handleResize() {
      setIsMobileLayout(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const reportParams = {
    dateFrom: dateRange[0].format('YYYY-MM-DD'),
    dateTo: dateRange[1].format('YYYY-MM-DD'),
  };
  const { data, isFetching } = useGetStudentSourceReportQuery(reportParams);
  const { data: courseReport, isFetching: isCoursesFetching } = useGetCourseStudentReportQuery();
  const sources = data?.sources || [];
  const courses = courseReport?.courses || [];

  return (
    <section className="page">
      <div
        className="reports-layout"
        style={isMobileLayout ? { display: 'flex', flexDirection: 'column', gap: 16 } : undefined}
      >
        <div className="reports-source-lines">
          <div className="reports-source-title-row">
            <div>
              <Typography.Title level={2}>O'quvchilar oqimi</Typography.Title>
              <span>Jami: {formatNumber(data?.total)} ta</span>
            </div>
            <RangePicker
              popupClassName="mobile-range-picker-dropdown"
              inputReadOnly
              value={dateRange}
              format="DD.MM.YYYY"
              allowClear={false}
              onChange={(values) => {
                if (values?.[0] && values[1]) {
                  setDateRange([values[0], values[1]]);
                }
              }}
            />
          </div>

          {isFetching ? (
            <div className="reports-source-loading">
              <Spin />
            </div>
          ) : sources.length ? (
            sources.map((source) => (
              <div className="reports-source-line" key={source.source}>
                <div className="reports-source-line-header">
                  <div>
                    <strong>{source.source}</strong>
                    <span>{formatNumber(source.count)} ta o'quvchi</span>
                  </div>
                  <b>{source.percent}%</b>
                </div>
                <Progress percent={source.percent} showInfo={false} strokeColor="var(--color-success)" trailColor="#353b46" />
              </div>
            ))
          ) : (
            <Empty description="Tanlangan davrda o'quvchi topilmadi" />
          )}
        </div>

        <div className="reports-source-lines">
          <div className="reports-source-title-row">
            <div>
              <Typography.Title level={2}>Kurslar</Typography.Title>
              <span>Jami: {formatNumber(courseReport?.total)} ta o'quvchi</span>
            </div>
          </div>

          {isCoursesFetching ? (
            <div className="reports-source-loading">
              <Spin />
            </div>
          ) : courses.length ? (
            courses.map((course) => (
              <div className="reports-source-line" key={course.course}>
                <div className="reports-source-line-header">
                  <div>
                    <strong>{course.course}</strong>
                    <span>{formatNumber(course.count)} ta o'quvchi</span>
                  </div>
                  <b>{course.percent}%</b>
                </div>
                <Progress percent={course.percent} showInfo={false} strokeColor="var(--color-secondary)" trailColor="#353b46" />
              </div>
            ))
          ) : (
            <Empty description="Kurslarda o'quvchi topilmadi" />
          )}
        </div>
      </div>
    </section>
  );
}
