import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

const visionX = {
  cream:       '#F8F3E1',
  sage:        '#AEB784',
  sageDark:    '#8a9460',
  olive:       '#41431B',
  oliveMid:    '#5a5c28',
  terracotta:  '#B84C3A',
  parchment:   '#EDE8D4',
  sand:        '#C8B882',
  ink:         '#1e2008',
  warmGray:    '#7a7560',
};

export const SegmentTimeline = ({ segments, onSegmentClick }) => {
  if (!segments || segments.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '48px',
        background: visionX.ink,
        border: `1px solid ${visionX.oliveMid}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "var(--font-sans)",
        fontSize: '11px',
        color: visionX.warmGray,
        letterSpacing: '0.15em',
      }}>
        AWAITING SEGMENT DATA
      </div>
    );
  }

  const getSegmentColor = (confidence) => {
    if (confidence > 0.7) return visionX.terracotta;
    if (confidence > 0.4) return visionX.sand;
    return visionX.sage;
  };

  const chartData = {
    labels: segments.map((s) => `${s.start_time}s`),
    datasets: [
      {
        label: 'Risk Score',
        data: segments.map((s) => Math.round(s.confidence * 100)),
        backgroundColor: segments.map((s) => getSegmentColor(s.confidence)),
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const clickedSegment = segments[elements[0].index];
        onSegmentClick(clickedSegment.start_time);
      }
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: visionX.oliveMid, tickColor: 'transparent' },
        ticks: {
          color: visionX.warmGray,
          font: { family: "var(--font-mono)", size: 10 },
          callback: (value) => `${value}%`,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: visionX.warmGray,
          font: { family: "var(--font-mono)", size: 10 },
          maxTicksLimit: 10,
        },
        border: { color: visionX.oliveMid },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: visionX.olive,
        titleColor: visionX.sand,
        bodyColor: visionX.cream,
        borderColor: visionX.sageDark,
        borderWidth: 1,
        titleFont: { family: "var(--font-mono)", size: 10 },
        bodyFont: { family: "var(--font-sans)", size: 11, weight: 'bold' },
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return `${segments[index].start_time}s — ${segments[index].end_time}s`;
          },
          label: (context) => `RISK INDEX: ${context.raw}%`,
        },
      },
      legend: { display: false },
    },
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        width: '100%',
        height: '180px',
        background: `linear-gradient(180deg, ${visionX.parchment} 0%, #77a067ff 100%)`,
        padding: '10px 12px',
        borderRadius: '6px',
        border: `1px solid ${visionX.oliveMid}`,
        boxShadow: `inset 0 1px 0 rgba(174, 183, 132, 0.08)`,
      }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Custom Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: '9px',
          color: visionX.warmGray,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Audio Strata — Seconds
        </span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { color: visionX.sage,       label: 'AUTHENTIC' },
            { color: visionX.sand,       label: 'UNCERTAIN' },
            { color: visionX.terracotta, label: 'SYNTHETIC' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}60`,
              }} />
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                color: visionX.warmGray,
                letterSpacing: '0.1em',
              }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};