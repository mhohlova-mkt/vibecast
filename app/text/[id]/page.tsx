import ArticlePage, {
  generateMetadata as generateArticleMetadata,
} from '@/app/a/[id]/page'

export const dynamic = 'force-dynamic'
export const generateMetadata = generateArticleMetadata

export default ArticlePage
