import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

interface ChartProps {
    name: string;
    token0: string;
    token1: string;
    data: { time: string; price: number }[];
    type: 'token' | 'pool';
}

export default function Chart({ name, token0, token1, data, type = 'token' }: ChartProps) {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    // 添加 data 的深度比较
    const memoizedData = useMemo(() => {
        return data.map(item => ({
            time: item.time,
            price: item.price
        }));
    }, [JSON.stringify(data)]); // 使用 JSON.stringify 进行深度比较

    const calculateAPY = (price: number): number => {
        return (price / 100) * 12;
    };

    // 修改 option 的依赖项
    const option = useMemo(() => {
        const latestPrice = data.length > 0 ? data[data.length - 1].price : 0;
        const previousPrice = data.length > 1 ? data[data.length - 2].price : 0;
        let apy = 0;

        if (latestPrice !== 0 && previousPrice !== 0) {
            apy = calculateAPY((latestPrice - previousPrice) / previousPrice * 100);
        }

        return {
            title: { 
                text: type === 'token' ? `{price|$${latestPrice}}\n{apy|${apy >= 0.01 ? '▲' : '▼'} ${Math.abs(apy).toFixed(2)}%}` : `{price|1 ${token0} = ${latestPrice} ${token1}}\n{apy|${apy >= 0.01 ? '▲' : '▼'} ${Math.abs(apy).toFixed(2)}%}`,
                textStyle: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#fff',
                    rich: {
                        price: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
                        apy: {
                            fontSize: 12,
                            fontWeight: 'bold',
                            color: apy >= 0.01 ? '#4eaf0a' : '#e84749',
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
            // dataZoom: [
            //     {
            //         type: 'inside',
            //         zoomOnMouseWheel: true, // 允许放大
            //         moveOnMouseWheel: true, // 允许缩小
            //         start: 0, // 初始显示的起始位置
            //         end: 100, // 初始显示的结束位置
            //         rangeMode: ['value', 'value'], // 限制缩放范围
            //         minValueSpan: 10, // 最小可见范围
            //     },
            // ],
        };
    }, [memoizedData, token0, token1]); // 使用 memoizedData 替代 data

    useEffect(() => {
        if (chartRef.current) {
            // 只有在没有图表实例或数据发生变化时才初始化
            if (!chartInstanceRef.current) {
                chartInstanceRef.current = echarts.init(chartRef.current);
            }
            
            chartInstanceRef.current.setOption(option);

            // 事件监听器设置
            chartInstanceRef.current.on('updateAxisPointer', function (event: any) {
                const dataIndex = event.dataIndex;
                if (typeof dataIndex === 'undefined' || dataIndex <= 0) return;

                const currentPrice = data[dataIndex]?.price;
                const previousPrice = data[dataIndex - 1]?.price;

                if (currentPrice !== undefined && previousPrice !== undefined) {
                    const apy = calculateAPY((currentPrice - previousPrice) / previousPrice * 100);
                    chartInstanceRef.current?.setOption({
                        title: { 
                            text: type === 'token' ? 
                                `{price|$${currentPrice}}\n{apy|${apy >= 0.01 ? '▲' : '▼'} ${Math.abs(apy).toFixed(2)}%}` : 
                                `{price|1 ${token0} = ${currentPrice} ${token1}}\n{apy|${apy >= 0.01 ? '▲' : '▼'} ${Math.abs(apy).toFixed(2)}%}`,
                            textStyle: {
                                rich: {
                                    price: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
                                    apy: {
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        color: apy >= 0.01 ? '#4eaf0a' : '#e84749',
                                        padding: [10, 0, 0, 0]
                                    }
                                }
                            }
                        },
                    });
                }
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.off('updateAxisPointer');
                chartInstanceRef.current.dispose();
                chartInstanceRef.current = null;
            }
        };
    }, [token0, token1, memoizedData]); // 使用 memoizedData 替代 data


    return data.length > 0 ? (
        <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
    ) : (
        <div 
            style={{
                width: '100%',
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}
        >
            <svg
                width="300"
                height="100"
                viewBox="0 0 300 100"
                style={{
                    opacity: 0.6
                }}
            >
                <path
                    d="M 0,50 Q 75,20 150,50 T 300,50"
                    fill="none"
                    stroke="#3498db"
                    strokeWidth="2"
                    style={{
                        animation: 'pathAnimate 3s linear infinite'
                    }}
                />
            </svg>
            <style jsx global>{`
                @keyframes pathAnimate {
                    0% {
                        stroke-dasharray: 500;
                        stroke-dashoffset: 500;
                    }
                    100% {
                        stroke-dasharray: 500;
                        stroke-dashoffset: -500;
                    }
                }
            `}</style>
        </div>
    );
}