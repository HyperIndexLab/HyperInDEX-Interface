export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { default: Post } = await import(`@/markdown/${slug}.mdx`)
 
  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 markdown-content">
      <Post />
    </div>
  )
}
 
export function generateStaticParams() {
  return [{ slug: 'welcome' }, { slug: 'about' }]
}
 
export const dynamicParams = false