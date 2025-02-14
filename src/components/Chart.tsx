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

            // 获取最新数据的价格
            const latestPrice = data.length > 0 ? data[data.length - 1].price : 0;
            const previousPrice = data.length > 1 ? data[data.length - 2].price : 0;

            let apyText = '';
            let apy = 0;

            if (latestPrice !== 0 && previousPrice !== 0) {
                apy = calculateAPY((latestPrice - previousPrice) / previousPrice * 100);
               
            }

            const option = {
                title: { 
                    text: `{price|价格: ${latestPrice}}\n{apy|APY: ${apy.toFixed(2)}%}`,
                    textStyle: {
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: '#fff',
                        rich: {
                            price: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
                            apy: {
                                fontSize: 12,
                                fontWeight: 'bold',
                                color: apy >= 0 ? 'green' : 'red',
                                padding: [10, 0, 0, 0]
                            }
                        },
                    },
                },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(50, 50, 50, 0.8)',
                    textStyle: {
                        color: '#fff',
                    },
                    formatter: function (params: any) {
                        if (params.length > 0) {
                            const price = params[0].data[1];
                            
                            return `Price: ${price}`;
                        }
                        return '';
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
                        name: 'chart',
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

            chartInstance.on('updateAxisPointer', function (event: any) {
                const dataIndex = event.dataIndex; // 取到索引
                if (typeof dataIndex === 'undefined' || dataIndex <= 0) return; // 确保索引有效且大于0

                const currentPrice = data[dataIndex]?.price;
                const previousPrice = data[dataIndex - 1]?.price;

                if (currentPrice !== undefined && previousPrice !== undefined) {
                    const apy = calculateAPY((currentPrice - previousPrice) / previousPrice * 100);
                    chartInstance.setOption({
                        title: { text: `{price|价格: ${currentPrice}}\n{apy|APY: ${apy.toFixed(2)}%}` },
                    });
                }
            });
            
            return () => {
                chartInstance.off('updateAxisPointer');
                chartInstance.dispose();
            };
        }
    }, [data]);

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}