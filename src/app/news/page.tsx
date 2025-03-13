import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';

// 获取所有新闻文章
async function getNewsArticles() {
  // MDX 文件存储在上一级目录的 markdown 文件夹中
  const newsDirectory = path.join(process.cwd(), 'src/markdown');
  
  // 确保目录存在
  if (!fs.existsSync(newsDirectory)) {
    console.warn('新闻目录不存在:', newsDirectory);
    return [];
  }
  
  // 获取目录中的所有 .mdx 文件
  const fileNames = fs.readdirSync(newsDirectory).filter(file => file.endsWith('.mdx'));
  
  // 获取每个文件的内容和元数据
  const articles = fileNames.map(fileName => {
    // 从文件名创建 slug
    const slug = fileName.replace(/\.mdx$/, '');
    
    // 读取 MDX 文件内容
    const fullPath = path.join(newsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    
    // 使用 gray-matter 解析文件的元数据部分
    const { data } = matter(fileContents);
    
    console.log('data===', data);
    // 返回带有 slug 和元数据的对象
    return {
      slug,
      title: data.title,
      summary: data.summary,
      ...data,
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : 'unknown date'
    };
  });
  
  // 按日期排序，最新的文章排在前面
  return articles.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export default async function NewsPage() {
  // 获取新闻文章
  const newsItems = await getNewsArticles();
  
  return (
    <div className="container mx-auto px-4 py-8 mt-10 max-w-[1200px]">
      <h1 className="text-3xl font-bold mb-6">Latest News</h1>
      
      {newsItems.length === 0 ? (
        <p className="text-gray-600">No news articles yet</p>
      ) : (
        <div className="grid gap-10">
          {newsItems.map((news) => (
            <div 
              key={news.slug} 
              className="border border-gray-700 rounded-lg p-6 mb-2 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-gray-800 hover:border-gray-500"
            >
              <Link href={`/news/${news.slug}`} className="block">
                <h2 className="text-xl font-semibold mb-2 hover:text-blue-400 transition-colors">{news.title}</h2>
                {news.summary && <p className="text-gray-400 mb-3">{news.summary}</p>}
                <div className="text-sm text-gray-500">Published Date: {news.date}</div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
