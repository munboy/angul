import { PrismaClient, Genre } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full system access',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user',
    },
  });

  console.log('Roles seeded:', { adminRole, userRole });

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@cinematch.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me_in_production';
  const adminName = 'System Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log('Admin user seeded:', { id: newAdmin.id, email: newAdmin.email });
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  const genresData = [
    { tmdbId: 28, name: 'Action' },
    { tmdbId: 12, name: 'Adventure' },
    { tmdbId: 35, name: 'Comedy' },
    { tmdbId: 18, name: 'Drama' },
    { tmdbId: 53, name: 'Thriller' },
    { tmdbId: 878, name: 'Sci-Fi' },
    { tmdbId: 16, name: 'Animation' },
  ];

  const dbGenres: Genre[] = [];
  for (const g of genresData) {
    const genre = await prisma.genre.upsert({
      where: { tmdbId: g.tmdbId },
      update: { name: g.name },
      create: { tmdbId: g.tmdbId, name: g.name },
    });
    dbGenres.push(genre);
  }
  console.log(`Seeded ${dbGenres.length} genres.`);

  const getGenreId = (tmdbId: number) => {
    const found = dbGenres.find((dg) => dg.tmdbId === tmdbId);
    return found ? found.id : 0;
  };

  const moviesData = [
    {
      tmdbId: 27205,
      title: 'Inception',
      originalTitle: 'Inception',
      overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: "inception", the implantation of another person\'s idea into a target\'s subconscious.',
      posterPath: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
      backdropPath: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
      voteAverage: 8.4,
      voteCount: 35000,
      popularity: 85.5,
      releaseDate: new Date('2010-07-16'),
      originalLanguage: 'en',
      runtime: 148,
      genreTmdbIds: [28, 53, 878],
    },
    {
      tmdbId: 155,
      title: 'The Dark Knight',
      originalTitle: 'The Dark Knight',
      overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.',
      posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdropPath: '/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg',
      voteAverage: 8.5,
      voteCount: 31000,
      popularity: 92.1,
      releaseDate: new Date('2008-07-18'),
      originalLanguage: 'en',
      runtime: 152,
      genreTmdbIds: [28, 18, 53],
    },
    {
      tmdbId: 680,
      title: 'Pulp Fiction',
      originalTitle: 'Pulp Fiction',
      overview: 'A burger-loving hitman, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip back and forth in time.',
      posterPath: '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg',
      backdropPath: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
      voteAverage: 8.5,
      voteCount: 26000,
      popularity: 74.3,
      releaseDate: new Date('1994-09-10'),
      originalLanguage: 'en',
      runtime: 154,
      genreTmdbIds: [53, 18, 35],
    },
    {
      tmdbId: 13,
      title: 'Forrest Gump',
      originalTitle: 'Forrest Gump',
      overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historical events—in each case, far exceeding what anyone imagined he could do. Yet, despite all the things he has attained, his one true love, Jenny, eludes him.',
      posterPath: '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',
      backdropPath: '/66Kn4XWhkuPkJxOJyPEx4U2CUfN.jpg',
      voteAverage: 8.5,
      voteCount: 25000,
      popularity: 68.2,
      releaseDate: new Date('1994-07-06'),
      originalLanguage: 'en',
      runtime: 142,
      genreTmdbIds: [18, 35],
    },
    {
      tmdbId: 603,
      title: 'The Matrix',
      originalTitle: 'The Matrix',
      overview: 'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents who conceive the ultimate rebellion against the artificial intelligence system that controls the world.',
      posterPath: '/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg',
      backdropPath: '/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg',
      voteAverage: 8.2,
      voteCount: 24000,
      popularity: 60.5,
      releaseDate: new Date('1999-03-30'),
      originalLanguage: 'en',
      runtime: 136,
      genreTmdbIds: [28, 878],
    },
    {
      tmdbId: 157336,
      title: 'Interstellar',
      originalTitle: 'Interstellar',
      overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
      posterPath: '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
      backdropPath: '/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
      voteAverage: 8.4,
      voteCount: 32000,
      popularity: 88.3,
      releaseDate: new Date('2014-11-05'),
      originalLanguage: 'en',
      runtime: 169,
      genreTmdbIds: [18, 878],
    },
    {
      tmdbId: 129,
      title: 'Spirited Away',
      originalTitle: '千と千尋の神隠し',
      overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.',
      posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
      backdropPath: '/m4TUa2ciEWSlk37rOsjiSIvZDXE.jpg',
      voteAverage: 8.5,
      voteCount: 15000,
      popularity: 55.4,
      releaseDate: new Date('2001-07-20'),
      originalLanguage: 'ja',
      runtime: 125,
      genreTmdbIds: [16, 18, 12],
    },
    {
      tmdbId: 496243,
      title: 'Parasite',
      originalTitle: '기생충',
      overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
      posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      backdropPath: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
      voteAverage: 8.5,
      voteCount: 16000,
      popularity: 72.8,
      releaseDate: new Date('2019-05-30'),
      originalLanguage: 'ko',
      runtime: 132,
      genreTmdbIds: [53, 18, 35],
    },
    {
      tmdbId: 98,
      title: 'Gladiator',
      originalTitle: 'Gladiator',
      overview: 'In the year 180, the death of Emperor Marcus Aurelius throws the Roman Empire into chaos. Maximus Decimus Meridius, one of the Roman army\'s most capable and trusted generals, is betrayed by the ambitious Commodus, who seizes the throne.',
      posterPath: '/aDb548BOkFfI4nFm0kx8A3Ezh7H.jpg',
      backdropPath: '/Ar7QuJ7sJEiC0oP3I8fKBKIQD9u.jpg',
      voteAverage: 8.2,
      voteCount: 17000,
      popularity: 64.9,
      releaseDate: new Date('2000-05-01'),
      originalLanguage: 'en',
      runtime: 155,
      genreTmdbIds: [28, 18, 12],
    },
    {
      tmdbId: 278,
      title: 'The Shawshank Redemption',
      originalTitle: 'The Shawshank Redemption',
      overview: 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden. During his time in the prison, Dufresne befriends Allied prisoners and a wise inmate named Red.',
      posterPath: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
      backdropPath: '/pNjh59JSxChQktamG3LMp9ZoQzp.jpg',
      voteAverage: 8.7,
      voteCount: 26000,
      popularity: 79.1,
      releaseDate: new Date('1994-09-23'),
      originalLanguage: 'en',
      runtime: 142,
      genreTmdbIds: [18],
    },
  ];

  for (const m of moviesData) {
    const { genreTmdbIds, ...moviePayload } = m;
    
    const movie = await prisma.movie.upsert({
      where: { tmdbId: moviePayload.tmdbId },
      update: moviePayload,
      create: moviePayload,
    });

    await prisma.movieGenre.deleteMany({
      where: { movieId: movie.id },
    });

    for (const gTmdbId of genreTmdbIds) {
      const gId = getGenreId(gTmdbId);
      if (gId > 0) {
        await prisma.movieGenre.create({
          data: {
            movieId: movie.id,
            genreId: gId,
          },
        });
      }
    }
  }

  console.log(`Seeded ${moviesData.length} sample movies and mappings.`);
  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
