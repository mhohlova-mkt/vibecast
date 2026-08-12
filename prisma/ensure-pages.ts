/**
 * Досоздаёт недостающие страницы компании, не затирая уже отредактированные.
 * Запускается при каждом обновлении: так новые страницы появляются
 * на существующих установках, где сид уже не сработает.
 */
import { PrismaClient } from '../generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'
import { articleSlugBase } from '../lib/article-slug'

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  }),
})

/**
 * Политика обработки персональных данных.
 *
 * Короткая политика без лишних разделов: только то, что соответствует
 * фактическим формам и базе портала.
 */
const PRIVACY = `Политика обработки персональных данных Vibecast

Оператор

ООО «БАКСЭТ», ИНН 4345115602, ОГРН 1054316805927. Адрес: 610007, Кировская область, г. Киров, ул. Ленина, д. 164, помещение 14. По вопросам обработки данных: hello@vibecast.one.

Какие данные и зачем обрабатываем

Адрес электронной почты — для доступа к эфирам, обратной связи и, при отдельном согласии, отправки дайджеста. Имя и сообщения — для участия в чате. Имя, фотографию и присланный материал — для рассмотрения и публикации предложенной новости. IP-адрес, данные браузера, дату и текст согласия — чтобы подтвердить ваш выбор и защитить формы от злоупотреблений.

Основание и действия с данными

Основание обработки — ваше согласие. Мы собираем, записываем, храним, уточняем, используем и удаляем данные только для перечисленных целей. Согласие на дайджест отделено от согласия на обработку данных и не является условием доступа к эфирам.

Хранение и передача

Данные хранятся в Российской Федерации до достижения цели обработки или отзыва согласия. Доступ получают сотрудники и подрядчики оператора, которым он необходим для работы сайта, хостинга и рассылки. Они обрабатывают данные по поручению оператора и не вправе использовать их для своих целей. Мы не продаём персональные данные.

Как отказаться и удалить данные

Дайджест можно выключить переключателем рядом с вашим адресом на сайте или ссылкой в письме. Для отзыва согласия, получения копии, исправления или удаления данных напишите на hello@vibecast.one. После проверки обращения мы прекратим обработку и удалим данные в сроки, установленные законом, кроме сведений, которые обязаны хранить по закону.

Публикация материалов

Предложенный текст, имя и фотография публикуются только после отдельного согласия и проверки редакцией. Согласие на такую публикацию можно отозвать обращением на hello@vibecast.one.

Обновление политики

Актуальная редакция политики всегда доступна на этой странице. Дата редакции: 12 августа 2026 года.`

/**
 * Первая редакция политики — заготовка, которую разослали на существующие
 * установки. Её узнаём по началу текста, чтобы заменить на нормальную
 * версию. Отредактированную руками страницу это условие не тронет.
 */
const PRIVACY_DRAFT_MARK =
  'Текст подготовлен как основа — перед публикацией его следует согласовать с юристом компании.'

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

  // Заготовку политики заменяем на актуальный текст. Если страницу уже
  // правили в админке — не трогаем, чужую работу затирать нельзя.
  const privacy = await prisma.page.findUnique({ where: { id: 'privacy' } })
  if (
    privacy &&
    (privacy.body.includes(PRIVACY_DRAFT_MARK) || privacy.body.includes('ЗАПОЛНИТЬ'))
  ) {
    await prisma.page.update({ where: { id: 'privacy' }, data: { body: PRIVACY } })
    console.log('политика обработки данных обновлена с черновой версии')
  }

  // Домена vibecast.ru не существует — он ни разу не был делегирован и
  // приехал из демо-контента прототипа. Письма на такие адреса не уходят
  // никуда. Чиним на каждом обновлении, а не разово: страницы правятся
  // руками в админке, и старый адрес легко вернуть копипастом.
  const stale = await prisma.page.findMany({
    where: { body: { contains: 'vibecast.ru' } },
  })
  for (const p of stale) {
    await prisma.page.update({
      where: { id: p.id },
      data: { body: p.body.replace(/vibecast\.ru/g, 'vibecast.one') },
    })
  }
  if (stale.length) {
    console.log(`адреса @vibecast.ru исправлены на страницах: ${stale.map((p) => p.id).join(', ')}`)
  }

  // Старым статьям присваиваем короткие адреса, новые получают их при
  // первом сохранении в админке. Совпадения разводим числовым суффиксом.
  const articles = await prisma.article.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })
  const used = new Set(articles.map((article) => article.slug).filter(Boolean))
  let slugged = 0
  for (const article of articles) {
    if (article.slug) continue
    const base = articleSlugBase(article.title)
    let slug = base
    let suffix = 2
    while (used.has(slug)) slug = `${base}_${suffix++}`
    await prisma.article.update({ where: { id: article.id }, data: { slug } })
    used.add(slug)
    slugged++
  }
  if (slugged) console.log(`красивых адресов статей создано: ${slugged}`)

  const broadcasts = await prisma.broadcast.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })
  const usedBroadcastSlugs = new Set(
    broadcasts.map((broadcast) => broadcast.slug).filter(Boolean),
  )
  let broadcastSlugged = 0
  for (const broadcast of broadcasts) {
    if (broadcast.slug) continue
    const base = articleSlugBase(broadcast.title)
    let slug = base
    let suffix = 2
    while (usedBroadcastSlugs.has(slug)) slug = `${base}_${suffix++}`
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { slug },
    })
    usedBroadcastSlugs.add(slug)
    broadcastSlugged++
  }
  if (broadcastSlugged)
    console.log(`красивых адресов вебинаров создано: ${broadcastSlugged}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
