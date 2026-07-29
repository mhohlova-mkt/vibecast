/**
 * Досоздаёт недостающие страницы компании, не затирая уже отредактированные.
 * Запускается при каждом обновлении: так новые страницы появляются
 * на существующих установках, где сид уже не сработает.
 */
import { PrismaClient } from '../generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  }),
})

const PRIVACY = `Ниже описано, какие данные собирает портал vibecast и что с ними происходит. Текст подготовлен как основа — перед публикацией его следует согласовать с юристом компании.

Какие данные мы собираем

Адрес электронной почты — когда вы открываете доступ к трансляции, подписываетесь на дайджест или предлагаете новость. Имя — если вы указали его в чате эфира или в форме предложения новости. Фотографию и текст — если вы прислали материал для публикации.

Зачем они нужны

Чтобы открыть вам доступ к эфирам и записям, присылать анонсы и дайджест, подписывать ваши сообщения в чате и публиковать присланные материалы под вашим именем.

Как долго храним

Пока вы не попросите удалить данные. Мы удалим их по первому обращению.

Кому передаём

Никому, кроме сервиса рассылки писем — и только адрес, чтобы письмо дошло. Мы не продаём данные и не передаём их третьим лицам для рекламы.

Как отказаться

Напишите нам, и мы удалим ваш адрес из базы. В каждом письме есть ссылка для отписки — одного нажатия достаточно.

Как с нами связаться

Через раздел «Контакты» на этом сайте.`

const PAGES = [
  { id: 'about', title: 'О проекте', body: '' },
  { id: 'speakers', title: 'Спикерам', body: '' },
  { id: 'contacts', title: 'Контакты', body: '' },
  { id: 'privacy', title: 'Обработка данных', body: PRIVACY },
] as const

async function main() {
  let created = 0
  for (const p of PAGES) {
    const existing = await prisma.page.findUnique({ where: { id: p.id } })
    if (existing) continue
    await prisma.page.create({ data: p })
    created++
  }
  console.log(`страниц досоздано: ${created}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
