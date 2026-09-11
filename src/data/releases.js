// src/data/releases.js

import { DEFAULT_PRODUCER, DEFAULT_SOURCE } from "./credits.js";

/**
 * Global Artist Profiles
 */
export const ARTIST_PLATFORMS = {
  spotify: "https://open.spotify.com/artist/4MABf2UVjygh9b2rjo0mHB?si=QqwRlydcTJGHlJTUly0-9w",
  appleMusic: "https://music.apple.com/us/artist/silachomka/170226",
  youtubeMusic: "https://music.youtube.com/@silachomka",
  audiomack: "https://audiomack.com/silachomka-1",
  boomplay: "https://www.boomplay.com/artists/EQJTTl1wrbD_5-N55O11X2zF?from=search",
  deezer: "https://www.deezer.com/fr/artist/225364255",
};

const createRelease = ({
  number,
  title,
  slug,
  edition,
  date,
  displayDate,
  cover,
  description,
  // Accept either sources (array) or source (string) for backward compat
  sources,
  source,
  platforms = {},
  tracks = [],
  type,
  artist,
  featsSilachomka = false,
  producedBySilachomka = true,
}) => {
  // Normalise to a sources array
  let normalisedSources;
  if (Array.isArray(sources) && sources.length > 0) {
    normalisedSources = sources;
  } else if (typeof source === "string" && source.trim()) {
    normalisedSources = [source.trim()];
  } else {
    normalisedSources = [DEFAULT_SOURCE];
  }

  // Auto-determine type if not explicitly provided
  let derivedType = type;
  if (!derivedType) {
    derivedType = tracks.length <= 2 ? "single" : "ep";
  }

  return {
    number,
    title,
    slug,
    edition,
    date,
    displayDate,
    cover,
    type: derivedType,
    artist: artist || "silachomka",
    featsSilachomka,
    producedBySilachomka,
    sources: normalisedSources,
    description:
      description ||
      `${title} is an official studio release by ${artist || "silachomka"} published under ${normalisedSources.join(" & ")}.`,
    platforms: {
      ...platforms,
    },
    tracks: tracks.map((track) => {
      // Normalise to a producers array
      let normalisedProducers;
      if (Array.isArray(track.producers) && track.producers.length > 0) {
        normalisedProducers = track.producers;
      } else if (typeof track.producer === "string" && track.producer.trim()) {
        normalisedProducers = [track.producer.trim()];
      } else {
        normalisedProducers = [DEFAULT_PRODUCER];
      }
      // Spread track first so any extra fields are preserved,
      // then explicitly set the normalised array field.
      const { producer: _p, producers: _ps, ...rest } = track;
      return { ...rest, producers: normalisedProducers };
    }),
  };
};

const releases = [
  /* =========================================================
     NEW RELEASES (ADDED VIA SCRIPT)
     ========================================================= */
  createRelease({
    title: "FRIDAYTHE13TH",
    slug: "fridaythe13th",
    date: "2025-06-09",
    displayDate: "Monday, 9th June, 2025",
    cover: "/covers/skazz084berg-fridaythe13th.jpg",
    type: "ep",
    artist: "Skazz, 084BERG",
    featsSilachomka: false,
    producedBySilachomka: true,
    source: "Pagne Park Records/Oluwatobi Samuel Adeniyi & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/53ooJPucEDsGmZJNxrsl9J?si=vjFOajkHRli_aaUgt6f1Xw",
      appleMusic: "https://music.apple.com/us/album/fridaythe13th-ep/1819592956",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lD2hJUJ3JqAG_Hcdmdn25Iij0YAU-oqRg&si=X9KJOqhQY566pmen",
      deezer: "https://link.deezer.com/s/34mrPJ2I8Sz7ksuYW29nX"
    },
    tracks: [
      {
        title: "No Be Jazz",
        featuring: ["K4MY"],
        platforms: {
          spotify: "https://open.spotify.com/track/5LCaojgkX8eUwuK0qwxMHI?si=4797d5330bf24eeb",
          appleMusic: "https://music.apple.com/us/song/no-be-jazz-feat-k4my/1819592961",
          youtubeMusic: "https://music.youtube.com/watch?v=Jfo54RNKCMc&si=Fhg79nXdycEgtUxU",
          deezer: "https://link.deezer.com/s/34mrQbNwHWXIMxor6J3O9"
        }
      }
    ]
  }),

  createRelease({
    title: "SOBOBO",
    slug: "sobobo",
    cover: "/covers/hunchoa-sobobo.jpg",
    date: "2025-03-15",
    displayDate: "Saturday, 15th March, 2025",
    type: "single",
    artist: "HunchoA, Dy, Mylestone",
    featsSilachomka: false,
    producedBySilachomka: true,
    source: "HunchoA & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/track/4YNr11danXpfgkVz9KTsyo?si=526d0f46b1b9444c",
      appleMusic: "https://music.apple.com/us/album/sobobo-single/1801767800",
      youtubeMusic: "https://music.youtube.com/watch?v=Z23UhgepzwQ&si=Yg0zKKT920RYVgYE",
      audiomack: "https://audiomack.com/hunchoaye/song/sobobo"
    },
    tracks: [
      {
        title: "Sobobo",
        platforms: {
          appleMusic: "https://music.apple.com/us/song/sobobo/1801767803",
          audiomack: "https://audiomack.com/hunchoaye/song/sobobo"
        }
      }
    ]
  }),

  createRelease({
    title: "OYA NOW + HENNY",
    slug: "oya-now-henny",
    date: "2024-11-26",
    displayDate: "Tuesday, 26th November, 2024",
    cover: "/covers/084berg-oyanow.jpg",
    type: "single",
    artist: "084BERG",
    featsSilachomka: true,
    producedBySilachomka: false,
    source: "Pagne Park Records & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/6w7gFj2QB3lFHfV3loFD8z?si=Y11dxKFKQv6z_jmBX8xBjw",
      appleMusic: "https://music.apple.com/ng/album/oya-now-henny-single/1781969941",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lu8jj-nYGQmqWCj69_xNeAPIOEId7T9gI&si=b4Do4zzv_Y6tl2GJ",
      deezer: "https://link.deezer.com/s/34mq9jt8D00kbXbnIGspU"
    },
    tracks: [
      {
        title: "Oya Now (Freestyle)",
        featuring: ["silachomka"],
        platforms: {
          spotify: "https://open.spotify.com/track/1y04TQKRzUpfKBvMP4DZ6H?si=f5d50c7eee5f4944",
          appleMusic: "https://music.apple.com/ng/song/oya-now-freestyle/1781969942",
          youtubeMusic: "https://music.youtube.com/watch?v=xEeW9pF7ZcA&si=6Cy5ahKo4IP6ZJke",
          deezer: "https://link.deezer.com/s/34mq9MzGZGWN3kRLnSsV3"
        }
      }
    ]
  }),

  createRelease({
    title: "TWÈN",
    slug: "twen",
    date: "2024-08-20",
    displayDate: "Tuesday, 20th August, 2024",
    cover: "/covers/skazz-twen.jpg",
    type: "ep",
    artist: "Skazz",
    featsSilachomka: true,
    producedBySilachomka: true,
    source: "Oluwatobi Samuel Adeniyi & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/3doAPFLOQnkCecKPVJVJx2?si=knHH5XcdSoqOANrneIQ5Kg",
      appleMusic: "https://music.apple.com/ng/album/tw%C3%A8n-ep/1782338845",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lXcsR_Bt4kIVHiN3jqYF-mkht8DPnqXjI&si=QJes5fWFinSH_7vd",
      audiomack: "https://audiomack.com/skazz-4/album/twen",
      deezer: "https://link.deezer.com/s/34mq7YEtbBmFvpTplxaTw"
    },
    tracks: [
      {
        title: "On Soft",
        featuring: ["silachomka"],
        platforms: {
          spotify: "https://open.spotify.com/track/78SUhKMEVpSRmBh1oLmTRi?si=8a62ee06eec249c2",
          appleMusic: "https://music.apple.com/ng/song/on-soft-feat-silachomka/1782339126",
          youtubeMusic: "https://music.youtube.com/watch?v=kBFnUnmiLu4&si=SluzyKaD12JZwxaY",
          audiomack: "https://audiomack.com/skazz-4/song/on-soft",
          deezer: "https://link.deezer.com/s/34mq8nCygUGS9Yhvews7N"
        }
      }
    ]
  }),

  createRelease({
    title: "THE IMPOSTER PACKAGE",
    slug: "the-imposter-package",
    date: "2024-08-20",
    displayDate: "Tuesday, 20th August, 2024",
    cover: "/covers/kaayo-theimposterpackage.jpg",
    type: "ep",
    artist: "kaayo",
    featsSilachomka: true,
    producedBySilachomka: true,
    source: "PHD Services & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/2TZRt85NRh3BNIguCJdk5j?si=DBpqremLSq6eWNK6LOB5Dw",
      appleMusic: "https://music.apple.com/ng/album/the-imposter-package-ep/1759617182",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lfqGUoRFiwUWEpAi2WLEhyGNB_Iqiyg4g&si=0JInBnWtS56z1ZhC",
      deezer: "https://link.deezer.com/s/34mq6If2x9qHQKluKPhDu"
    },
    tracks: [
      {
        title: "F4NCy Nigga!",
        featuring: ["K4MY", "silachomka"],
        platforms: {
          spotify: "https://open.spotify.com/track/4vE1njBsQbQszgnvYSotqt?si=0d65984cf2f54db1",
          appleMusic: "https://music.apple.com/ng/song/f4ncy-nigga-feat-k4my-silachomka/1759617189",
          youtubeMusic: "https://music.youtube.com/watch?v=AkwmYvFV43A&si=rI5k58TGCNB6QLat",
          deezer: "https://link.deezer.com/s/34mq7qGHVGR2qkfFRD5vo"
        }
      }
    ]
  }),

  createRelease({
    title: "HYPERDRIVE: INGRËSS ZONE",
    slug: "hyperdrive-ingress-zone",
    date: "2024-07-31",
    displayDate: "Wednesday, 31st July, 2024",
    cover: "/covers/k4my-hyperdriveingresszone.jpg",
    type: "ep",
    artist: "K4MY",
    featsSilachomka: true,
    producedBySilachomka: true,
    source: "405! & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/4dwSmlnLBygHGz7ZM2JxYV?si=--tV9Up6SPaTu-hC60A03Q",
      appleMusic: "https://music.apple.com/ng/album/hyperdrive-ingr%C3%ABss-zone/1841123990",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_mu_EDVqVwjb3j-OQ-LXicibLo4A5z9FVc&si=RfoEQc5FKfuNlyTt",
      audiomack: "https://audiomack.com/younghazard/album/hyperdrive-ingress-zone-1",
      deezer: "https://link.deezer.com/s/34mq4CdeV6yzMF2emNfMQ"
    },
    tracks: [
      {
        title: "DISCORD",
        featuring: ["silachomka"],
        platforms: {
          spotify: "https://open.spotify.com/track/3qnCj5RiPMzspIDaRmbIoP?si=d0ed4bb99f344b99",
          appleMusic: "https://music.apple.com/ng/song/discord/1841123992",
          youtubeMusic: "https://music.youtube.com/watch?v=4n24DoC8YLk&si=5Lsma1PPFdxIaFil",
          audiomack: "https://audiomack.com/younghazard/song/k4my-discord-mastered",
          deezer: "https://link.deezer.com/s/34mq5act6LGF8BzYhKksJ"
        }
      },
      {
        title: "UPPERECHELON",
        featuring: ["bornfrompagne", "silachomka"],
        platforms: {
          spotify: "https://open.spotify.com/track/3qnCj5RiPMzspIDaRmbIoP?si=d0ed4bb99f344b99",
          appleMusic: "https://music.apple.com/ng/song/upperechelon-feat-bornfrompagne-silachomka/1841124204",
          youtubeMusic: "https://music.youtube.com/watch?v=auFiG-Yiwec&si=XVOJ1LM0YdOG7HSZ",
          audiomack: "https://audiomack.com/younghazard/song/k4my-upper-echelon-mastered",
          deezer: "https://link.deezer.com/s/34mq5xzNSEEl7piwpoWlz"
        }
      },
      {
        title: "HYPERDRIVE MOTIVATOR",
        featuring: ["kayo", "KOMÉ", "grand4rcher"],
        platforms: {
          spotify: "https://open.spotify.com/track/5WCAd0AHGsJd4XkuDyRiuD?si=572cbed2a60d465c",
          appleMusic: "https://music.apple.com/us/song/hyperdrive-motivator-feat-kayogotbanned-kom%C3%A9-grand4rcher/1841123991",
          youtubeMusic: "https://music.youtube.com/watch?v=GdPaeTwJFUs&si=p5BgiSKbftbG_kFJ",
          audiomack: "https://audiomack.com/younghazard/song/hyperdrive-motivator-mastered",
          deezer: "https://link.deezer.com/s/34mrSsGqkH7djtDIcapXr"
        }
      },
      {
        title: "EMOTIONALLY SOBER",
        featuring: ["Serene", "SHAMMAH"],
        platforms: {
          spotify: "https://open.spotify.com/track/4gX9qppC8Y52wDxhwcm3by?si=23742f14782742a0",
          appleMusic: "https://music.apple.com/us/song/emotionally-sober-feat-serene-shammah/1841124203",
          youtubeMusic: "https://music.youtube.com/watch?v=PJMk2lDrA00&si=fd6FKnucnqcbkFr8",
          audiomack: "https://audiomack.com/younghazard/song/k4my-emotionally-sober-mastered",
          deezer: "https://link.deezer.com/s/34mrSX9AwjnAiJfmHs6xi"
        }
      },
      {
        title: "GANGSTA FEVER",
        featuring: ["Serene"],
        platforms: {
          spotify: "https://open.spotify.com/track/3vJNUgkDPPH50XdPirTNrG?si=e80e88b190e040fa",
          appleMusic: "https://music.apple.com/us/song/gangsta-fever-feat-serene/1841124205",
          youtubeMusic: "https://music.youtube.com/watch?v=6KvArYzPVpg&si=kTolUDvhtdPMGEVH",
          audiomack: "https://audiomack.com/younghazard/song/k4my-gangster-fever-mastered",
          deezer: "https://link.deezer.com/s/34mrTiHsxgiG4v28zJtbk"
        }
      },
      {
        title: "Pull up, Dance - BONUS TRACK",
        featuring: ["kayo", "KOMÉ", "grand4rcher"],
        platforms: {
          spotify: "https://open.spotify.com/track/6OmYjDoLHgf8unsabDUoUS?si=76f2116c6181423d",
          appleMusic: "https://music.apple.com/us/song/pull-up-dance-feat-kayogotbanned-kom%C3%A9-bonus-track/1841124206",
          youtubeMusic: "https://music.youtube.com/watch?v=2PA8eV6UKto&si=A-byotZTjlLcYzr0",
          audiomack: "https://audiomack.com/younghazard/song/k4my-pull-up-dance-mastered",
          deezer: "https://link.deezer.com/s/34mrTKonrnkHndSYnEhI3"
        }
      },
      {
        title: "INGRËSS ZONE - pretty girls interlude",
        platforms: {
          spotify: "https://open.spotify.com/track/0Kzo9eeENu6MUZaVvS91U7?si=21fb5aa78fa34280",
          appleMusic: "https://music.apple.com/us/song/ingr%C3%ABss-zone-pretty-girls-interlude/1841124207",
          youtubeMusic: "https://music.youtube.com/watch?v=QZgVVzZPHX4&si=JFQFDovv5YA9r1x6",
          audiomack: "https://audiomack.com/younghazard/song/k4my-ingress-zone-pretty-girls-interlude-mastered",
          deezer: "https://link.deezer.com/s/34mrU8aRdSfaE6gJhdJxE"
        }
      }
    ]
  }),

  createRelease({
    title: "DESPICABLE",
    slug: "despicable",
    date: "2023-12-30",
    displayDate: "Saturday, 30th December, 2023",
    cover: "/covers/bojaak-despicable.jpg",
    type: "single",
    artist: "BOJAAK",
    featsSilachomka: false,
    producedBySilachomka: true,
    source: "Bojaak & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/track/1knGqKXBkUgFYtTLVU9KMN?si=f9f5dd10e0914880",
      appleMusic: "https://music.apple.com/us/song/despicable/1722985610",
      youtubeMusic: "https://music.youtube.com/watch?v=zlwYRaJWwIY&si=RMhk7SFps9ATMBWO",
      audiomack: "https://audiomack.com/jacob_gcfr/song/despicable",
      deezer: "https://link.deezer.com/s/34mrWXwqjY0K9QtkpZi9F"
    },
    tracks: [
      {
        title: "Despicable",
        platforms: {
          spotify: "https://open.spotify.com/track/1knGqKXBkUgFYtTLVU9KMN?si=f9f5dd10e0914880"
        }
      }
    ]
  }),

  createRelease({
    title: "THURSDAY",
    slug: "thursday",
    date: "2023-10-20",
    displayDate: "Friday, 20th October, 2023",
    cover: "/covers/mlt-thursday.jpg",
    type: "single",
    artist: "MLT",
    featsSilachomka: true,
    producedBySilachomka: false,
    source: "1706 Gang & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/album/2RaZtz7CtmossmCJOTBTL6?si=GJUFdRgxSEO6ZSkqJI_0EA",
      appleMusic: "https://music.apple.com/ng/album/thursday-feat-silachomka-bergdorfbadman-single/1725477357",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lW8BVYD6N2ruc1l9_IzJjKjKlMq5d06eE&si=Mbz04FsGz-PGmKgN",
      audiomack: "https://audiomack.com/mlt1706/song/thursday",
      deezer: "https://link.deezer.com/s/34mq3aooFnDYuY1TeOD1f"
    },
    tracks: [
      {
        title: "Thursday",
        featuring: ["silachomka", "084BERG"],
        platforms: {
          spotify: "https://open.spotify.com/track/3qnCj5RiPMzspIDaRmbIoP?si=d0ed4bb99f344b99",
          appleMusic: "https://music.apple.com/ng/song/thursday-feat-silachomka-bergdorfbadman/1725477359",
          youtubeMusic: "https://music.youtube.com/watch?v=yklaCIiPmII&si=h7hYfVeYLZFTYQbB",
          audiomack: "https://audiomack.com/mlt1706/song/thursday",
          deezer: "https://link.deezer.com/s/34mq3FO3922oas27Mws3v"
        }
      }
    ]
  }),

  createRelease({
    title: "SPECIAAL",
    slug: "speciaal",
    date: "2023-10-06",
    displayDate: "Friday, 6th October, 2023",
    cover: "/covers/bojaak-speciaal.jpg",
    type: "single",
    artist: "BOJAAK",
    featsSilachomka: false,
    producedBySilachomka: true,
    source: "Bojaak & chomkaMUSIC™",
    platforms: {
      spotify: "https://open.spotify.com/track/50tdgSejucd5vopVw0LYNN?si=ad5ae14f9ada4ca0",
      appleMusic: "https://music.apple.com/us/song/speciaal/1710850023",
      youtubeMusic: "https://music.youtube.com/watch?v=CjzFT8v3p7Y&si=amb4F07Dgcza5IhW",
      deezer: "https://link.deezer.com/s/34mrVtjHJfnI7i4YjVafS"
    },
    tracks: [
      {
        title: "Speciaal",
        platforms: {
          spotify: "https://open.spotify.com/track/50tdgSejucd5vopVw0LYNN?si=ad5ae14f9ada4ca0"
        }
      }
    ]
  }),

  /* =========================================================
     RELEASE 10: NOISEMAKER
     ========================================================= */
  createRelease({
    number: 10,
    title: "NOISEMAKER",
    slug: "noisemaker",
    edition: 4,
    date: "2026-01-23",
    displayDate: "Friday, 23rd January, 2026",
    cover: "/covers/noisemaker.png",
    platforms: {
      spotify: "https://open.spotify.com/album/55sdC94v3Vy0lU2mUXwgQY?si=ci_hsqyVRMmTy4E32hrYUg",
      appleMusic: "https://music.apple.com/us/album/noisemaker-ep/1869379789",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_naLt-6L3uHGqZRQPikH0ONPP3BPp0-4WY&si=MVC2rETAlyFLpEd2",
      audiomack: "https://audiomack.com/silachomka-1/album/noisemaker",
      boomplay: "",
      deezer: "https://link.deezer.com/s/34aw33ZyI4UyNaiVq0Pom",
    },
    tracks: [
      {
        title: "Timeless",
        featuring: ["Black Jacob"],
        platforms: {
          spotify: "https://open.spotify.com/track/2jqyAoyAGPGMaO02nQq0s8?si=87a95e7fbc8340ee",
          appleMusic: "https://music.apple.com/us/song/timeless-feat-black-jacob/1869379790",
          youtubeMusic: "https://music.youtube.com/watch?v=eKYk0i6ATx8&si=OKaOelZmhJ2oJ90D",
          audiomack: "https://audiomack.com/silachomka-1/song/timeless",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34aw3BIdaZTvTm6abQjs3",
        },
      },
      {
        title: "Do iT",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/3hSSCyIRgNwS1lcnRDtxrI?si=b06f8160134a439b",
          appleMusic: "https://music.apple.com/us/song/do-it/1869379795",
          youtubeMusic: "https://music.youtube.com/watch?v=mlFGNex1whc&si=j-qHsioLjtlOijST",
          audiomack: "https://audiomack.com/silachomka-1/song/do-it",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34aw3YKorP3Bm6G1MK4fM",
        },
      },
      {
        title: "thunder",
        featuring: ["Black Jacob", "084BERG"],
        platforms: {
          spotify: "https://open.spotify.com/track/7nQ7j1RHYhr1u932PJwBZA?si=829105680f674359",
          appleMusic: "https://music.apple.com/us/song/thunder-feat-black-jacob-084berg/1869379796",
          youtubeMusic: "https://music.youtube.com/watch?v=RsAB6FowTEg&si=N6D1I03HVL4bYRW_",
          audiomack: "https://audiomack.com/silachomka-1/song/thunder",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34aw4gF4ZXvUYrOeesA51",
        },
      },
      {
        title: "facto",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/2Qv2Dn24I4SZJAHNps7Oa4?si=be23b58d64e14d04",
          appleMusic: "https://music.apple.com/us/song/facto/1869379917",
          youtubeMusic: "https://music.youtube.com/watch?v=rPh9jek5bjs&si=jO7_ttBHm_LSyXAt",
          audiomack: "https://audiomack.com/silachomka-1/song/facto",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34aw4xjcqqzQnxm4PNmFE",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 9: ITEM5
     ========================================================= */
  createRelease({
    number: 9,
    title: "ITEM5",
    slug: "item5",
    edition: 3,
    date: "2025-11-07",
    displayDate: "Friday, 7th November, 2025",
    cover: "/covers/item5.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/1zQDrUyahKBQRmaQJIXlwr?si=gAkkiwg7TRuDzL4GX-S9iw",
      appleMusic: "https://music.apple.com/us/album/item5-single/1849706971",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lEseLi9Sn7W_efPBAQK952vCqq430peGU&si=089bejhFAR9IADQc",
      audiomack: "https://audiomack.com/silachomka-1/album/item5",
      boomplay: "https://www.boomplay.com/albums/EQUpT9K7wjV4wvWh-mdmd73o?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34aw57aUOHHARFuFWImJC",
    },
    tracks: [
      {
        title: "Double Entendre",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/5CyWqpTnTvfzrIm1HKVNCs?si=e7a72c38dc454550",
          appleMusic: "https://music.apple.com/us/song/double-entendre/1849707244",
          youtubeMusic: "https://music.youtube.com/watch?v=HNkGCiIsqUs&si=jLWO3NuO8Vk1koc9",
          audiomack: "https://audiomack.com/silachomka-1/song/double-entendre",
          boomplay: "https://www.boomplay.com/songs/EQuA1c70t60dhEkcdR3Rcvt4?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw5pnlxY7X1JhPNjc7K",
        },
      },
      {
        title: "Item5",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/6zad3LxexFbrbGITF120e8?si=5b963db2c54143ca",
          appleMusic: "https://music.apple.com/us/song/item5/1849707253",
          youtubeMusic: "https://music.youtube.com/watch?v=9Qj-8Eb9Hbk&si=H7COcB5FC4zAwcL8",
          audiomack: "https://audiomack.com/silachomka-1/song/item5-1",
          boomplay: "https://www.boomplay.com/songs/EQvJxzMH2Ao1hqitiP498JGU?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw5O2IcP9rnTYdo956i",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 8: KPE FOR ME
     ========================================================= */
  createRelease({
    number: 8,
    title: "KPE FOR ME",
    slug: "kpe-for-me",
    edition: 3,
    date: "2025-07-18",
    displayDate: "Friday, 18th July, 2025",
    cover: "/covers/kpeforme.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/136hDkcW4oqo5H89tq57QI?si=9eqQJyXTS1aspFlW6MYErQ",
      appleMusic: "https://music.apple.com/us/album/kpe-for-me-single/1825425972",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_mJh85NaFkdVDxjaFInKqKAauJh-ssWW9w&si=_5E-oZulTjYE9H_r",
      audiomack: "https://audiomack.com/silachomka-1/song/kpe-for-me",
      boomplay: "https://www.boomplay.com/albums/EQU7u8XwRRBnh3IagSrSjaN0?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34aw6KsohSeLlbjfUlkeJ",
    },
    tracks: [
      {
        title: "Kpe for Me",
        featuring: ["BlaqEnergy"],
        platforms: {
          spotify: "https://open.spotify.com/track/1133fIg9urP8PUT6Qy88wo?si=0ad41e9ebd94461e",
          appleMusic: "https://music.apple.com/us/song/kpe-for-me/1825425976",
          youtubeMusic: "https://music.youtube.com/watch?v=mzRqosZ_s3U&si=d67oaP-mMTgYaUrU",
          audiomack: "https://audiomack.com/silachomka-1/song/kpe-for-me",
          boomplay: "https://www.boomplay.com/songs/EQsMxRBqdhcaFAesI0hlJEjl?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw6X9PNqxu8kMgjEhix",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 7: KISS & TELL
     ========================================================= */
  createRelease({
    number: 7,
    title: "KISS & TELL",
    slug: "kiss-and-tell",
    edition: 3,
    date: "2025-05-09",
    displayDate: "Friday, 9th May, 2025",
    cover: "/covers/kiss-and-tell.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/3LWMWqVN5KWCzqGiMy1tb2?si=LBxKtGV3RoO11jxpSx1fPw",
      appleMusic: "https://music.apple.com/us/album/kiss-tell-single/1811563916",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_lOwk04MPJu5PqzQB7Wi5-TpYDRoFCX7V4&si=91cxg92LuEx6lwUC",
      audiomack: "https://audiomack.com/silachomka-1/song/kiss-tell",
      boomplay: "https://www.boomplay.com/albums/EQUeS7Pzh9zhJrq4L3az9Ydm?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34aw7CuuvJwne1rj5quAD",
    },
    tracks: [
      {
        title: "Kiss & Tell",
        featuring: ["Skazz", "A1s"],
        platforms: {
          spotify: "https://open.spotify.com/track/1uqILoeeNNL18UuStjm03g?si=0eff97697a074e23",
          appleMusic: "https://music.apple.com/us/song/kiss-tell/1811563926",
          youtubeMusic: "https://music.youtube.com/watch?v=1dAKzuaYEl4&si=LlOzOARsbujgyDxw",
          audiomack: "https://audiomack.com/silachomka-1/song/kiss-tell",
          boomplay: "https://www.boomplay.com/songs/EQvAfrC7uhxMCXS6MoQWaI4M?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw7V6mnl9hPkWnkWfqf",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 6: DON'T PLAY SILACHOMKA
     ========================================================= */
  createRelease({
    number: 6,
    title: "DON'T PLAY SILACHOMKA",
    slug: "dont-play-silachomka",
    edition: 3,
    date: "2025-04-27",
    displayDate: "Sunday, 27th April, 2025",
    cover: "/covers/dont-play-silachomka.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/67jzi4h3HAtqR1RGvnj8e2?si=sIC81Z8YStCiEOlg8A5U1w",
      appleMusic: "https://music.apple.com/us/album/dont-play-silachomka-feat-%C3%BD%C4%A7%C4%93m%C3%B6-single/1809372236",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_n5zgrgkW3ePxktVBVYJBTjiqvym3h29VU&si=98apcVLC_SJs-fX_",
      audiomack: "https://audiomack.com/silachomka-1/song/dont-play-silachomka",
      boomplay: "https://www.boomplay.com/albums/EQXo_XdxuVz5gTWN-P0SS4Pv?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34aw8nTO9vsAh6R7H58mk",
    },
    tracks: [
      {
        title: "Don't Play Silachomka",
        featuring: ["ýħēmö"],
        platforms: {
          spotify: "https://open.spotify.com/track/55P1ISJpsBGiXaFuKmgaH3?si=313f515c77934b4f",
          appleMusic: "https://music.apple.com/us/song/dont-play-silachomka-feat-%C3%BD%C4%A7%C4%93m%C3%B6/1809372244",
          youtubeMusic: "https://music.youtube.com/watch?v=DcHZObmRTuo&si=W2dSyF3_4LvJYEOm",
          audiomack: "https://audiomack.com/silachomka-1/song/dont-play-silachomka",
          boomplay: "https://www.boomplay.com/songs/EQvTmDwvyaHXVgkqaJaPIamP?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw8BmeMJ7qkYOb9azNs",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 5: SAVAGE.
     ========================================================= */
  createRelease({
    number: 5,
    title: "SAVAGE.",
    slug: "savage",
    edition: 3,
    date: "2025-03-07",
    displayDate: "Friday, 7th March, 2025",
    cover: "/covers/savage.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/4cnno3w3u69MfOevcaP6PB?si=efRouRczTwuU5H0G_oBkNg",
      appleMusic: "https://music.apple.com/us/album/savage-ep/1798338197",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_l9LuXKTjQIEnBqTGPAAjnb1IiywNnnpeE&si=-q2zke01bxj1FkPu",
      audiomack: "https://audiomack.com/silachomka-1/album/savage",
      boomplay: "https://www.boomplay.com/albums/EQXPMf4Byu28kIZKt5D-MtoR?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34aw2ADZKu3cnCLYAml4V",
    },
    tracks: [
      {
        title: "Savage",
        featuring: ["hrtxpeji"],
        platforms: {
          spotify: "https://open.spotify.com/track/73TePK8ZfoBgRk0howRCla?si=de1a9ada4f00404c",
          appleMusic: "https://music.apple.com/us/song/savage-feat-hrtxpeji/1798338473",
          youtubeMusic: "https://music.youtube.com/watch?v=rKy7b_LfzSQ&si=BHZ5RC1jI_p1h6x0",
          audiomack: "https://audiomack.com/silachomka-1/song/savage",
          boomplay: "https://www.boomplay.com/songs/EQumezzW_ZOqqXj5O1yvQU05?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw9sqA68UUDqRUIZ3V2",
        },
      },
      {
        title: "Grit",
        featuring: ["Maadskilla", "K4MY"],
        platforms: {
          spotify: "https://open.spotify.com/track/5sqBG89lRGyrRuL4g7XJKO?si=6386606f4af14ca5",
          appleMusic: "https://music.apple.com/us/song/grit-feat-maadskilla-k4my/1798338620",
          youtubeMusic: "https://music.youtube.com/watch?v=xjvnmNP7BLE&si=OF4EYzlw3rNcanT7",
          audiomack: "https://audiomack.com/silachomka-1/song/grit",
          boomplay: "https://www.boomplay.com/songs/EQv1DxGAEjMofb6XdpkzSkOo?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw9IBmbyyUvFvgi6dRK",
        },
      },
      {
        title: "I'm the Man",
        featuring: ["Skazz", "MLT"],
        platforms: {
          spotify: "https://open.spotify.com/track/25cB06eb6Qcp5geEULizy6?si=f976477e4e884235",
          appleMusic: "https://music.apple.com/us/song/im-the-man-feat-skazz-mlt/1798338623",
          youtubeMusic: "https://music.youtube.com/watch?v=Nbxvy6lnnrw&si=9CKgjKrIH5tuv58R",
          audiomack: "https://audiomack.com/silachomka-1/song/im-the-man",
          boomplay: "https://www.boomplay.com/songs/EQsRAQIaTFefO7NrPOR-xBVb?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34aw9Z19lXd9UJ8WE2AZP",
        },
      },
      {
        title: "Nada",
        featuring: ["084BERG"],
        platforms: {
          spotify: "https://open.spotify.com/track/0ZhiAsH6nxZ31jZQjEA21Y?si=90f4098163f042a0",
          appleMusic: "https://music.apple.com/us/song/nada-feat-084berg/1798338625",
          youtubeMusic: "https://music.youtube.com/watch?v=tJSmtw660IU&si=PAxIaQa0w1Lp_6wZ",
          audiomack: "https://audiomack.com/silachomka-1/song/nada",
          boomplay: "https://www.boomplay.com/songs/EQscQAS-D5zYGXcIXE2G5GZr?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34awabveP1Zwz0970ZxIs",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 4: HUH. (WYS?)
     ========================================================= */
  createRelease({
    number: 4,
    title: "HUH. (WYS?)",
    slug: "huh-wys",
    edition: 3,
    date: "2025-01-17",
    displayDate: "Friday, 17th January, 2025",
    cover: "/covers/huh-wys.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/4VPXLTbX4HxMwmfOdQedx5?si=FQUYgr0qR8yIFhWCPc_KBQ",
      appleMusic: "https://music.apple.com/us/album/huh-wys-feat-skazz-k4my-084berg-single/1789779345",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_kCZ1ltmxvoBYkh7VX9zhPrKUHDkDFg32A&si=P9O5jEEw1cO-eUFK",
      audiomack: "https://audiomack.com/silachomka-1/song/huh-wys",
      boomplay: "https://www.boomplay.com/albums/EQWFsM3pSK12ppGLnvqLlDvk?from=search&srModel=COPYLINK&srList=WEB&share_content=album&share_channel=copylink&share_platform=web",
      deezer: "https://link.deezer.com/s/34awaFPrb99yEhy9xDD6E",
    },
    tracks: [
      {
        title: "Huh. (Wys?)",
        featuring: ["Skazz", "K4MY", "084BERG"],
        platforms: {
          spotify: "https://open.spotify.com/track/6O5n09XvIAG4BXV2Z1zUjs?si=006ba61ac99c4e20",
          appleMusic: "https://music.apple.com/us/song/huh-wys-feat-skazz-k4my-084berg/1789779619",
          youtubeMusic: "https://music.youtube.com/watch?v=W6cShxCnKbo&si=RadIGZpqA9Z1kQh1",
          audiomack: "https://audiomack.com/silachomka-1/song/huh-wys",
          boomplay: "https://www.boomplay.com/songs/EQuJzGKF8oNo6NK_i-z0XxdT?srModel=COPYLINK&srList=WEB&share_content=music&share_channel=copylink&share_platform=web",
          deezer: "https://link.deezer.com/s/34awaWvHekRBYXbt99cQf",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 3: ATROCITY.
     ========================================================= */
  createRelease({
    number: 3,
    title: "ATROCITY.",
    slug: "atrocity",
    edition: 3,
    date: "2024-12-20",
    displayDate: "Friday, 20th December, 2024",
    cover: "/covers/atrocity.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/31DYe1KwdR2iREDo8HZCGr?si=Glcuj-zCQFq-tqNZHZriKA",
      appleMusic: "https://music.apple.com/us/album/atrocity-single/1873393821",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_m1tYTXopVZgq_o1bcgB6BNwxhsbPC8BY8&si=D20b4iLp53YNFYpA",
      audiomack: "https://audiomack.com/silachomka-1/album/atrocity-2",
      boomplay: "",
      deezer: "https://link.deezer.com/s/34awbzWd1Tdb65y2wMW8I",
    },
    tracks: [
      {
        title: "Atrocity.",
        featuring: ["Duch"],
        platforms: {
          spotify: "https://open.spotify.com/track/5zk4IvXxjVnD1NP1G4rzci?si=9609b494c03f44a0",
          appleMusic: "https://music.apple.com/us/song/atrocity-feat-duch/1873393822",
          youtubeMusic: "https://music.youtube.com/watch?v=ukIFBscWN7o&si=I4UOyNn8nLhhaGca",
          audiomack: "https://audiomack.com/silachomka-1/song/atrocity-2",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awbThZA32B8mq8FE5gY",
        },
      },
      {
        title: "Me.",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/3xApHmkDC3frWOGSUY4Yzu?si=d532f1aaa616488c",
          appleMusic: "https://music.apple.com/us/song/me/1873393823",
          youtubeMusic: "https://music.youtube.com/watch?v=uQTdaKF_ft4&si=seBdK3vdCBI6rjDn",
          audiomack: "https://audiomack.com/silachomka-1/song/me-1",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awc6ulbgkUjjw6ZItum",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 2: BABY.
     ========================================================= */
  createRelease({
    number: 2,
    title: "BABY.",
    slug: "baby",
    edition: 3,
    date: "2024-11-23",
    displayDate: "Saturday, 23rd November, 2024",
    cover: "/covers/baby.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/5P612YbkZUoWWHH4SKTVPl?si=d8PbxoCgQlmuwYXLR5q72A",
      appleMusic: "https://music.apple.com/us/album/baby-single/1781541569",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_l5M_H-QOLeAV_CSzJj1S65plQd45znpyo&si=Yc9aW-XqhX-9GCvI",
      audiomack: "https://audiomack.com/silachomka-1/album/baby",
      boomplay: "",
      deezer: "https://link.deezer.com/s/34awdOxnbLmlp14JYaWIS",
    },
    tracks: [
      {
        title: "Baby.",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/5DRV3c1GiPfx9oNJh8qm7P?si=4ccd99c5d8404eb2",
          appleMusic: "https://music.apple.com/us/song/baby/1781541570",
          youtubeMusic: "https://music.youtube.com/watch?v=8RBuAWLXkAI&si=bIZcRP244v4pieg-",
          audiomack: "https://audiomack.com/silachomka-1/song/baby",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awe2Q9dZjaD5JmtLy1o",
        },
      },
      {
        title: "Ewe.",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/7LjoXsZosqrOwRogont3yU?si=41a12be266054356",
          appleMusic: "https://music.apple.com/us/song/ewe/1781541572",
          youtubeMusic: "https://music.youtube.com/watch?v=AHIymf3oSOA&si=5oBpnIj-NEhUPlb0",
          audiomack: "https://audiomack.com/silachomka-1/song/ewe",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awekS9gEWhg6oAbLOVy",
        },
      },
    ],
  }),

  /* =========================================================
     RELEASE 1: HORUS.
     ========================================================= */
  createRelease({
    number: 1,
    title: "HORUS.",
    slug: "horus",
    edition: 3,
    date: "2023-08-18",
    displayDate: "Friday, 18th August, 2023",
    cover: "/covers/horus.jpg",
    platforms: {
      spotify: "https://open.spotify.com/album/7FW6q3mjAgWQc6yxRrer34?si=Zc15i3j2QI6hF081FfoYmA",
      appleMusic: "https://music.apple.com/us/album/horus-ep/1873355627",
      youtubeMusic: "https://music.youtube.com/playlist?list=OLAK5uy_l0kqNDqiwNIoD4Y1FNhGM_8v7eDbTf9uA&si=dcxXZpE0MfndNIXi",
      audiomack: "https://audiomack.com/silachomka-1/album/horus-1",
      boomplay: "",
      deezer: "https://link.deezer.com/s/34awfb0GuVU6VxqX7TjAb",
    },
    tracks: [
      {
        title: "salmon",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/22ZhOmx99bIbmIEAL8434M?si=a8be8c76161742c4",
          appleMusic: "https://music.apple.com/us/song/salmon/1873355628",
          youtubeMusic: "https://music.youtube.com/watch?v=BofRfI2y4d0&si=xFor-hTNX4QFa7au",
          audiomack: "https://audiomack.com/silachomka-1/song/salmon",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awg9lShW5TffXjwrPfQ",
        },
      },
      {
        title: "apricot",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/6awX4iNGy7OkYoYTlgG9FO?si=49754a87ee954932",
          appleMusic: "https://music.apple.com/us/song/apricot/1873355629",
          youtubeMusic: "https://music.youtube.com/watch?v=zAIFauYhqAQ&si=wunyKVDTNYWVxXh5",
          audiomack: "https://audiomack.com/silachomka-1/song/apricot",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awfBoj1Zc3orL9cw1AC",
        },
      },
      {
        title: "magenta",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/1uPY4jtjG1zFEb2DqUNSRR?si=70861748643646df",
          appleMusic: "https://music.apple.com/us/song/magenta/1873355630",
          youtubeMusic: "https://music.youtube.com/watch?v=UrfgUeF06JI&si=b20RsZwvZ-aaqsfe",
          audiomack: "https://audiomack.com/silachomka-1/song/magenta",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awgvpOCqo4AA3KzbA9A",
        },
      },
      {
        title: "umber",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/0GwV9pW6DCaamAltEDgf35?si=0dd890f91f4e4db7",
          appleMusic: "https://music.apple.com/us/song/umber/1873355631",
          youtubeMusic: "https://music.youtube.com/watch?v=nk9pssIj2Y8&si=ZEaB0Ee12bmhnhlY",
          audiomack: "https://audiomack.com/silachomka-1/song/umber",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awhMwUS2dzdbqjejl1b",
        },
      },
      {
        title: "ecru",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/5HR2y8juRc63IwpJyvMK0O?si=1122caf082b146c1",
          appleMusic: "https://music.apple.com/us/song/ecru/1873355632",
          youtubeMusic: "https://music.youtube.com/watch?v=BfLb_76RfTQ&si=Mma2KRj_NCy2MWwG",
          audiomack: "https://audiomack.com/silachomka-1/song/ecru",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awi5rTxSY0XwznPC3bN",
        },
      },
      {
        title: "lilac",
        featuring: [],
        platforms: {
          spotify: "https://open.spotify.com/track/2nikAmXLRAacZF5JACu97s?si=d355361880594af7",
          appleMusic: "https://music.apple.com/us/song/lilac/1873355633",
          youtubeMusic: "https://music.youtube.com/watch?v=opM4_7QnTRE&si=8Zr9L641YJFFo_E_",
          audiomack: "https://audiomack.com/silachomka-1/song/lilac",
          boomplay: "",
          deezer: "https://link.deezer.com/s/34awisgIMa5VydRgyU5LZ",
        },
      },
    ],
  }),
];

export default releases;
