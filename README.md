# trisulfide

a simple, zero-dependency tiktok profile scraper.

## installation

```bash
npm install trisulfide
```

## usage

### cli tool

run interactively:
```bash
npx trisulfide
```

you'll be prompted to:
1. enter a tiktok username (with or without `@`)
2. choose output format (`j` for json, `b` for beautified)

**example:**
```bash
$ npx trisulfide
username: chipotle
format (j = json, b = beautified): b

fetching data for @chipotle...

==================================================
📂 user
   • id: 6646487634225135622
   • uniqueId: chipotle
   • nickname: Chipotle
   • region: United States 🇺🇸
   • verified: true
   • signature: new year, new me, same order
   • createTime: 1550184501 (2019-02-14 22:48:21)
   📂 commerceUserInfo
      • commerceUser: true
      • category: Food & Beverage
📂 stats
   • followerCount: 2700000
   • followingCount: 284
   • heartCount: 61200000
   • videoCount: 675
==================================================
```

### programmatic usage

```javascript
const trisulfide = require('trisulfide');

// basic usage
trisulfide('chipotle').then(data => {
  console.log(data);
});

// with async/await
async function getProfile() {
  const profile = await trisulfide('charlidamelio');
  console.log(`${profile.user.nickname} has ${profile.stats.followerCount} followers`);
}

// handle errors
trisulfide('nonexistentuser12345')
  .then(data => {
    if (data.error) {
      console.error('error:', data.error);
    } else {
      console.log(data);
    }
  });
```

## response structure

```javascript
{
  user: {
    id: "6646487634225135622",
    uniqueId: "chipotle",
    nickname: "Chipotle",
    avatarLarger: "https://...",
    avatarMedium: "https://...",
    avatarThumb: "https://...",
    signature: "new year, new me, same order",
    createTime: 1550184501,
    verified: true,
    secUid: "MS4wLjABAAAA...",
    region: "United States 🇺🇸",
    language: "en",
    privateAccount: false,
    ftc: false,
    relation: 0,
    openFavorite: true,
    commentSetting: 0,
    commerceUserInfo: {
      commerceUser: true,
      downLoadLink: {
        ios: "https://apps.apple.com/us/app/chipotle/id327228455"
      },
      category: "Food & Beverage",
      categoryButton: false
    },
    duetSetting: 0,
    stitchSetting: 0,
    secret: false,
    isADVirtual: false,
    uniqueIdModifyTime: 0,
    ttSeller: false,
    downloadSetting: 0,
    profileTab: {
      showMusicTab: false,
      showQuestionTab: false,
      showPlayListTab: true
    },
    followingVisibility: 1,
    nickNameModifyTime: 1701108055,
    isEmbedBanned: false,
    canExpPlaylist: true,
    profileEmbedPermission: 1,
    suggestAccountBind: false,
    isOrganization: 1,
    UserStoryStatus: 0
  },
  stats: {
    followerCount: 2700000,
    followingCount: 284,
    heart: 61200000,
    heartCount: 61200000,
    videoCount: 675,
    diggCount: 5948,
    friendCount: 201
  },
  statsV2: {
    followerCount: "2670403",
    followingCount: "284",
    heart: "61152856",
    heartCount: "61152856",
    videoCount: "675",
    diggCount: "5948",
    friendCount: "201"
  },
  itemList: []
}
```

### key fields

| field | type | description |
|-------|------|-------------|
| `user.id` | string | unique user id |
| `user.uniqueId` | string | username/handle |
| `user.nickname` | string | display name |
| `user.signature` | string | bio/description |
| `user.verified` | boolean | verification status |
| `user.region` | string | country with flag emoji |
| `user.privateAccount` | boolean | privacy status |
| `user.createTime` | number | account creation unix timestamp |
| `stats.followerCount` | number | total followers |
| `stats.followingCount` | number | total following |
| `stats.heartCount` | number | total likes received |
| `stats.videoCount` | number | total videos posted |

## region support

trisulfide converts iso country codes to full country names with flag emojis using a `countries.json` file. if missing, raw country codes are shown.

**example countries.json:**
```json
{
  "US": "United States 🇺🇸",
  "GB": "United Kingdom 🇬🇧",
  "CA": "Canada 🇨🇦",
  "AU": "Australia 🇦🇺",
  "DE": "Germany 🇩🇪",
  "FR": "France 🇫🇷",
  "JP": "Japan 🇯🇵"
}
```

## how it works

trisulfide uses a dual-fetch strategy:

1. **desktop fetch** - gets comprehensive json data from `__UNIVERSAL_DATA_FOR_REHYDRATION__` or `SIGI_STATE` script tags
2. **mobile fetch** - extracts region data using mobile user-agent (not always in desktop response)
3. **merge** - combines both responses for complete profile data

## error handling

```javascript
const result = await trisulfide('username');

if (result.error) {
  console.error('failed:', result.error);
} else {
  console.log('success:', result);
}
```

errors handled:
- invalid usernames
- http errors (status codes)
- timeouts (15s limit)
- json parse failures

## limitations

- subject to tiktok rate limiting
- may break if tiktok changes html structure
- no authentication support


## license

eclipse public license 2.0

copyright (c) 2025

this program and the accompanying materials are made available under the terms of the eclipse public license 2.0 which is available at https://www.eclipse.org/legal/epl-2.0/

## disclaimer

not affiliated with tiktok or bytedance.
