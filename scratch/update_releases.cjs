const fs = require('fs');

let content = fs.readFileSync('c:/development/silachomka/src/data/releases.js', 'utf8');

const old_args = `  platforms = {},
  tracks = [],
}) => {`;

const new_args = `  platforms = {},
  tracks = [],
  type,
  artist = "silachomka",
  featsSilachomka = false,
  producedBySilachomka = true,
}) => {`;

content = content.replace(old_args, new_args);

const old_return = `    platforms: {
      ...platforms,
    },`;

const new_return = `    type: type || (tracks.length <= 2 ? "single" : "ep"),
    artist,
    featsSilachomka,
    producedBySilachomka,
    platforms: {
      ...platforms,
    },`;

content = content.replace(old_return, new_return);

const old_desc = `    description:
      description ||
      \`\${title} is an official studio release by silachomka published under chomkaMUSIC™.\`,`;

const new_desc = `    description:
      description ||
      \`\${title} is an official studio release by \${artist} published under chomkaMUSIC™.\`,`;

content = content.replace(old_desc, new_desc);

const new_releases = `
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
`;

content = content.replace("const releases = [", "const releases = [" + new_releases);

fs.writeFileSync('c:/development/silachomka/src/data/releases.js', content);
