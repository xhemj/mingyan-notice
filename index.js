const log = console.log;
const axios = require("axios");
const MongoClient = require("mongodb").MongoClient;
const uaParserJs = require("ua-parser-js");
require("dotenv").config();

let feishuBaseTemplete = require("./feishuTemplete.json");

function getInputStr(str) {
  let argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    let item = argv[i];
    if (item.split("=")[0] === str)
      return item.replace(item.split("=")[0] + "=", "");
  }
  return null;
}

(async () => {
  const mapKey = getInputStr("mapkey") || process.env.mapkey;
  // const tencentKey = getInputStr("tencentkey") || process.env.tencentkey;
  const DBUri = getInputStr("uri") || process.env.uri;
  const googleApiKey = getInputStr("googlekey") || process.env.googlekey;
  const feishuKey = getInputStr("feishukey") || process.env.feishukey;
  let isDev = getInputStr("isdev") || process.env.isdev || false;
  isDev = Boolean(isDev);
  const ipv4Reg =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  const ipv6Reg =
    /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

  if (!mapKey || !DBUri || !googleApiKey || !feishuKey) {
    if (!mapKey) log("mapKey");
    if (!DBUri) log("DBUri");
    if (!googleApiKey) log("googleApiKey");
    if (!feishuKey) log("feishuKey");
    console.warn("传入参数错误");
    process.exit(-1);
  }

  if (isDev) log("当前为测试环境");

  const ipApiUrl = `https://file.xhemj.top/http://ip-api.com/json/[ip]?lang=zh-CN&fields=17494015`;
  // const staticMapApiUrl = [
  //   `https://apis.map.qq.com/ws/staticmap/v2/?key=${mapKey}`,
  //   "size=500*300&scale=2&zoom=10",
  //   `center=[lat],[lng]8&markers=color:red|size:large|[lat],[lng]`,
  // ].join("&");
  // const staticMapApiUrl = [
  //   "https://api.mapbox.com/styles/v1/xhemj/cku588hlo06g618p4oxb5vio5/static",
  //   `pin-s+ff0000([lng],[lat])/[lng],[lat],10,0`,
  //   `500x300?access_token=${mapKey}`,
  // ].join("/");
  const staticMapApiUrl = `https://xhemj.top/_map?lat=[lat]&lng=[lng]&text=[text]`;

  const client = await MongoClient.connect(DBUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = await client.db("xhemj");
  const dbo = await db.collection("mingyan-2021-ranking-waiting");

  let data = isDev ? [{ rid: "xxxxx" }] : await dbo.find({}).toArray();

  for (let i in data) {
    let feishuTemplete = feishuBaseTemplete;
    let item = data[i];
    let { rid } = item; // 获取等待发送列表的 rid
    let waitingRecord = await db
      .collection("mingyan-2021-ranking")
      .find({
        recordId: rid,
      })
      .toArray();
    waitingRecord = waitingRecord[0];
    if (isDev) {
      waitingRecord = {
        ip: "120.23.233.100",
        name: "测试专用，非真实记录",
        time: new Date().getTime(),
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
        rank: "",
      };
    }
    // log({ waitingRecord });
    let { ip, name, time, ua, rank } = waitingRecord;
    let imgUrl = "";
    let address = "";

    // 若 ipv4
    if (ipv4Reg.test(ip)) {
      // 获取经纬度
      let res = await axios.get(ipApiUrl.replace(/\[ip\]/gi, ip));
      res = res.data;
      let lat = res.lat;
      let lng = res.lon;
      address = `${res.country || ""} ${res.regionName || ""} ${
        res.city || ""
      } ${res.district || ""} ${res.isp || ""}`;
      // 图片链接
      imgUrl = staticMapApiUrl
        .replace(/\[lat\]/gi, lat)
        .replace(/\[lng\]/gi, lng)
        .replace(/\[text\]/gi, address);
    } else if (ipv6Reg.test(ip)) {
      let res = await axios.get(
        `https://file.xhemj.top/https://ip.zxinc.org/api.php?type=json&ip=${ip}`
      );
      res = res.data;
      address = res.data.location.replace(/\t/g, " ");
    }

    let uaInfo = new uaParserJs(ua);
    uaInfo = uaInfo.getResult();
    let browser = uaInfo.browser.name + " " + uaInfo.browser.version;
    let device = uaInfo.os.name + " " + uaInfo.os.version;

    let shortLink = "暂无数据";
    if (imgUrl) {
      shortLink = await axios.post(
        `https://file.xhemj.top/https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${googleApiKey}`,
        {
          dynamicLinkInfo: {
            domainUriPrefix: "f.h36.top",
            link: imgUrl,
          },
          suffix: {
            option: "SHORT",
          },
        }
      );
      shortLink = shortLink.data.shortLink;
      // shortLink = shortLink.replace("https://", "http://");
    }
    if (ipv6Reg.test(ip)) shortLink = "暂无数据（ipv6 格式暂无经纬度数据）";
    // log({ shortLink });
    feishuTemplete = JSON.stringify(feishuTemplete);
    feishuTemplete = feishuTemplete
      .replace("${name}", name)
      .replace("${time}", new Date(time).toLocaleString())
      .replace("${ip}", ip)
      .replace("${ipFrom}", address || "暂无信息")
      .replace("${rank}", rank || "暂无信息")
      .replace("${browser}", browser || "暂无信息")
      .replace("${device}", device || "暂无信息")
      .replace("${ua}", ua || "暂无信息")
      .replace("${ipLocationPic}", shortLink || "暂无信息")
      .replace("${year}", new Date().getFullYear())
      .replace("${sendTime}", new Date().toLocaleString());
    feishuTemplete = JSON.parse(feishuTemplete);

    await axios.post(
      `https://open.feishu.cn/open-apis/bot/v2/hook/${feishuKey}`,
      feishuTemplete
    );

    await dbo.deleteOne({
      rid: rid,
    });
  }
  client.close();
})();
