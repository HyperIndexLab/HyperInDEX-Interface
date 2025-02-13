import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartProps {
    data: { time: string; price: number }[];
}

export default function Chart({ data }: ChartProps) {
    const chartRef = useRef<HTMLDivElement | null>(null);

    const calculateAPY = (price: number): number => {
        return (price / 100) * 12;
    };

    useEffect(() => {
        if (chartRef.current) {
            const chartInstance = echarts.init(chartRef.current);

            const option = {
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(50, 50, 50, 0.8)',
                    textStyle: {
                        color: '#fff',
                    },
                    formatter: function (params: any) {
                        const price = params[0].data[1];
                        const apy = calculateAPY(price);
                        return `Price: ${price}<br/>APY: ${apy.toFixed(2)}%`;
                    },
                },
                xAxis: {
                    type: 'category',
                    data: data.map(item => item.time),
                    axisLine: { show: false }, // 去掉 x 轴的横线
                    axisLabel: { color: '#666' },
                },
                yAxis: {
                    type: 'value',
                    position: 'right', // 将 y 轴移动到右侧
                    axisLine: { show: false }, // 去掉 y 轴的横线
                    axisLabel: { color: '#666' },
                    splitLine: { show: false }, // 去掉 y 轴的分隔线
                    boundaryGap: [0, '100%'],
                    min: function (value: any) {
                        return value.min / 2; // 从最小值的一半开始
                    }
                },
                series: [
                    {
                        data: data.map(item => [item.time, item.price]),
                        type: 'line',
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(135, 206, 250, 0.8)' }, // 浅蓝色
                                { offset: 1, color: 'rgba(135, 206, 250, 0.1)' }, // 渐变到透明
                            ]),
                        },
                        lineStyle: {
                            color: 'rgba(135, 206, 250, 1)', // 设置线条颜色为浅蓝色
                            width: 2, // 设置线条宽度
                        },
                        symbol: 'none', // 去掉连接点
                    },
                ],
                grid: {
                    left: '3%',
                    right: '3%',
                    bottom: '3%',
                    containLabel: true,
                },
                dataZoom: [
									{
										type: 'inside',
										zoomOnMouseWheel: true, // 允许放大
										moveOnMouseWheel: true, // 允许缩小
										start: 0, // 初始显示的起始位置
										end: 100, // 初始显示的结束位置
										rangeMode: ['value', 'value'], // 限制缩放范围
										minValueSpan: 10, // 最小可见范围
								},
                ],
            };

            chartInstance.setOption(option);

            return () => {
                chartInstance.dispose();
            };
        }
    }, [data]);

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}