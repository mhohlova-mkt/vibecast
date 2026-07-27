/**
 * Сид: переносит демо-контент прототипа (vibecast_store) в БД.
 * Идемпотентен — повторный запуск не плодит дубли.
 */
import { PrismaClient } from '../generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

const RATIO = '4106/2437'

const cats = [
  { id: 'c1', name: 'ВАЙБКОДИНГ', bg: 'accent', text: '#15160F' },
  { id: 'c2', name: 'ИНСТРУМЕНТЫ', bg: '#CCD2C2', text: '#2A2C20' },
  { id: 'c3', name: 'БИЗНЕС', bg: '#D9CEF2', text: '#2E2640' },
  { id: 'c4', name: 'ОБУЧЕНИЕ', bg: '#ECCDB9', text: '#3D2A1C' },
  { id: 'c5', name: 'НОВОСТИ', bg: '#15160F', text: '#F4F3EC' },
]

const team = [
  { id: 't2', name: 'Ирина Полякова', email: 'irina@vibecast.ru', role: 'editor' },
  { id: 't3', name: 'Денис Орлов', email: 'denis@vibecast.ru', role: 'editor' },
  { id: 't4', name: 'Анна Лебедева', email: 'anna@vibecast.ru', role: 'moderator' },
]

const broadcasts = [
  {
    id: 'b1',
    title: 'Собираем SaaS за 90 минут: от идеи до деплоя',
    speaker: 'Артём Кравцов',
    role: 'Lead Engineer, Foundry',
    date: '2026-07-02',
    time: '18:00',
    status: 'live',
    link: 'https://telemost.yandex.ru/j/81920457133742',
    embed: false,
    chat: false,
    pollQuestion: 'На каком стеке собираете прототипы?',
    pollOptions: JSON.stringify([
      'Next.js + Claude / LLM',
      'Python + FastAPI',
      'No-code (Bubble, Retool)',
      'Свой стек',
    ]),
    tags: '#вайбкодинг #saas #livecoding #deploy',
    desc: 'Собираем рабочий SaaS-продукт с нуля прямо в эфире: проектируем схему данных по описанию задачи, генерируем API-роуты, подключаем оплату и выкатываем на прод.',
    sortIndex: 0,
  },
  {
    id: 'b2',
    title: 'Дизайн-системы для вайбкодеров',
    speaker: 'Мария Зотова',
    role: 'Design Lead',
    date: '2026-07-03',
    time: '19:00',
    status: 'scheduled',
    link: 'https://telemost.yandex.ru/j/40275811936620',
    tags: '#дизайн #ui',
    desc: 'Как собрать и переиспользовать дизайн-систему, когда код пишет AI.',
    sortIndex: 1,
  },
  {
    id: 'b3',
    title: 'Автоматизация бизнеса на AI-агентах',
    speaker: 'Никита Воронов',
    role: 'AI Consultant',
    date: '2026-06-12',
    time: '18:00',
    status: 'recorded',
    link: '',
    tags: '#агенты #автоматизация',
    desc: 'Разбор реальных кейсов автоматизации процессов агентами.',
    sortIndex: 2,
  },
  {
    id: 'b4',
    title: 'От промпта к продукту: архитектура AI-приложений',
    speaker: 'Артём Кравцов',
    role: 'Lead Engineer, Foundry',
    date: '2026-07-24',
    time: '18:00',
    status: 'draft',
    link: '',
    tags: '#архитектура',
    desc: '',
    sortIndex: 3,
  },
]

const articles = [
  {
    id: 'p1',
    title: 'Сколько жмёшь, братуха?',
    cat: 'ВАЙБКОДИНГ',
    author: 'Кирилл Седов',
    excerpt:
      'Тест «Are you in the weights?»: проверяем, живёте ли вы в весах больших моделей — от GPT-5.5 до Qwen3.',
    status: 'published',
    coverSrc: '/uploads/cover-bratuha.png',
    sec: 'feed',
    blocks: [
      {
        type: 'text',
        content:
          'Thomas Dimson и Joey Flynn собрали ретро-тест, который по имени и паре фактов оценивает, «живёте» ли вы в весах десятка популярных моделей. Мы прошли его всей редакцией — и залипли на час.',
      },
    ],
  },
  {
    id: 'p2',
    title: 'Вернётся ли Fable5',
    cat: 'НОВОСТИ',
    author: 'Ирина Полякова',
    excerpt:
      'Проект пропал с радаров вместе с логотипом. Разбираемся, что произошло и ждать ли возвращения.',
    status: 'published',
    coverSrc: '/uploads/cover-fable5.png',
    sec: 'feed',
    blocks: [
      {
        type: 'text',
        content:
          'Сайт недоступен, соцсети молчат, а команда перестала отвечать инвесторам. Мы собрали всё, что известно о судьбе Fable5 на сегодня.',
      },
    ],
  },
  {
    id: 'p3',
    title: 'На шпагате между двумя проектами',
    cat: 'ОБУЧЕНИЕ',
    author: 'Павел Громов',
    excerpt:
      'Как тянуть два продукта одновременно и не порваться: режим, инструменты и честные приоритеты.',
    status: 'published',
    coverSrc: '/uploads/cover-shpagat.jpg',
    sec: 'learn',
    blocks: [
      {
        type: 'text',
        content:
          'Секрет не в героизме, а в растяжке: постепенное увеличение нагрузки, жёсткие тайм-боксы и автоматизация всего, что повторяется.',
      },
    ],
  },
  {
    id: 'p4',
    title: 'Заменены AI',
    cat: 'БИЗНЕС',
    author: 'Анна Лебедева',
    excerpt:
      'Выпускники-2026 выходят на рынок, где часть junior-вакансий уже закрыта агентами. Что им делать?',
    status: 'published',
    coverSrc: '/uploads/cover-zameneny-ai.jpg',
    sec: 'feed',
    blocks: [
      {
        type: 'text',
        content:
          'Ленты «Будет заменён ИИ» — мем выпускного сезона. Но за шуткой стоит реальный сдвиг: компании нанимают меньше джунов и больше операторов агентов.',
      },
      {
        type: 'quote',
        content: 'Заменят не ИИ, а человек, который умеет им пользоваться.',
        caption: 'Анна Лебедева',
      },
    ],
  },
  {
    id: 'p5',
    title: 'Не ИИ мне',
    cat: 'ВАЙБКОДИНГ',
    author: 'Денис Орлов',
    excerpt:
      'Усталость от ИИ-хайпа — это нормально. Как отделить пользу от шума и не выгореть на новостях.',
    status: 'published',
    coverSrc: '/uploads/cover-ne-ii-mne.jpg',
    sec: 'tools',
    blocks: [
      {
        type: 'text',
        content:
          'Каждый день — новая модель, новый агент, новый «убийца всего». Рассказываем, как фильтровать поток и оставлять в работе только то, что реально экономит время.',
      },
    ],
  },
  {
    id: 'a7',
    title: 'Как мы переехали на агентный воркфлоу за неделю',
    cat: 'ВАЙБКОДИНГ',
    author: 'Ирина Полякова',
    excerpt: 'Черновик: опыт редакции vibecast.',
    status: 'draft',
    coverSrc: null,
    sec: 'feed',
    blocks: [{ type: 'text', content: '' }],
  },
]

const pages = [
  {
    id: 'about',
    title: 'О проекте',
    body: 'vibecast — медиа и платформа вебинаров об IT, вайбкодинге и инструментах, которые позволяют собирать продукты без большой команды разработки.\n\nМы делаем прямые эфиры с практиками, публикуем разборы инструментов и учебные материалы. Записи всех эфиров доступны зарегистрированным читателям.',
  },
  {
    id: 'speakers',
    title: 'Спикерам',
    body: 'Выступите в эфире vibecast: расскажите о своём опыте, продукте или рабочем процессе.\n\nФормат — 60–90 минут: живой разбор, демо и ответы на вопросы зрителей. Аудитория — предприниматели, продакты и разработчики, которые собирают продукты с помощью AI-инструментов.\n\nНапишите нам на hello@vibecast.ru с темой «Эфир» — вернёмся с датами в течение пары дней.',
  },
  {
    id: 'contacts',
    title: 'Контакты',
    body: 'Почта редакции: hello@vibecast.ru\n\nПо вопросам партнёрств и рекламы: partners@vibecast.ru\n\nTelegram: @vibecast',
  },
]

async function main() {
  for (const [i, c] of cats.entries()) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: { ...c, sortIndex: i },
      update: { ...c, sortIndex: i },
    })
  }

  // Владелец создаётся отдельно при первом входе (задаёт свой пароль).
  for (const m of team) {
    await prisma.user.upsert({
      where: { email: m.email },
      create: { ...m, invited: true },
      update: { name: m.name, role: m.role },
    })
  }

  for (const b of broadcasts) {
    await prisma.broadcast.upsert({ where: { id: b.id }, create: b, update: b })
  }

  const catByName = new Map(
    (await prisma.category.findMany()).map((c) => [c.name, c.id]),
  )
  for (const [i, a] of articles.entries()) {
    const data = {
      id: a.id,
      title: a.title,
      categoryId: catByName.get(a.cat) ?? null,
      author: a.author,
      excerpt: a.excerpt,
      status: a.status,
      coverSrc: a.coverSrc,
      coverRatio: a.coverSrc ? RATIO : null,
      sec: a.sec,
      blocks: JSON.stringify(a.blocks),
      sortIndex: i,
      publishedAt: a.status === 'published' ? new Date() : null,
    }
    await prisma.article.upsert({ where: { id: a.id }, create: data, update: data })
  }

  for (const p of pages) {
    await prisma.page.upsert({ where: { id: p.id }, create: p, update: p })
  }

  await prisma.home.upsert({
    where: { id: 'home' },
    create: {
      id: 'home',
      heroArticleId: 'p1',
      bannerEnabled: true,
      bannerHtml: '',
      bannerLink: 'https://example.ru',
      learnPinOn: true,
      learnPinTitle: 'EdMe — профессия в IT с личным ИИ-наставником',
      learnPinDesc:
        'Подбор направления, индивидуальный план обучения с практикой и поддержка наставника на каждом шаге. 5 направлений, 20 профессий.',
      learnPinLink: 'https://edme.pro',
      homePromoId: null,
    },
    update: {},
  })

  const counts = {
    рубрики: await prisma.category.count(),
    статьи: await prisma.article.count(),
    трансляции: await prisma.broadcast.count(),
    страницы: await prisma.page.count(),
    команда: await prisma.user.count(),
  }
  console.log('Сид выполнен:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
