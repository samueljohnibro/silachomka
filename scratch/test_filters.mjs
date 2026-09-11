import releases from '../src/data/releases.js';

let counts = {
    all: releases.length,
    silachomka: releases.filter(r => r.artist === "silachomka").length,
    singles: releases.filter(r => r.type === "single").length,
    eps: releases.filter(r => r.type === "ep").length,
    albums: releases.filter(r => r.type === "album").length,
    ft_silachomka: releases.filter(r => r.featsSilachomka).length,
    prod_by_silachomka: releases.filter(r => r.producedBySilachomka !== false).length,
};

console.log(counts);
