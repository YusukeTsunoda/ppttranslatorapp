import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsChartProps {
  data: {
    timestamp: string;
    value: number;
  }[];
  title: string;
  color: string;
  threshold?: number;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  data,
  title,
  color,
  threshold
}) => {
  const chartData: ChartData<'line'> = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: title,
        data: data.map(d => d.value),
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4
      },
      ...(threshold ? [{
        label: 'Threshold',
        data: Array(data.length).fill(threshold),
        borderColor: 'red',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }] : [])
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (title.includes('Memory')) {
              return value + ' MB';
            } else if (title.includes('Time')) {
              return value + ' ms';
            } else if (title.includes('Error')) {
              return value + '%';
            }
            return value;
          }
        }
      }
    },
    animation: {
      duration: 0 // リアルタイム更新のためアニメーションを無効化
    }
  };

  return (
    <div className="w-full h-[300px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <Line data={chartData} options={options} />
    </div>
  );
}; 