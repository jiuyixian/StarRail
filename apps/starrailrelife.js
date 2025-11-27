import plugin from '../../../../../lib/plugins/plugin.js'
import setting from '../model/setting.js'
import fs from 'node:fs'
import { modResources } from '../model/MODpath.js'
import puppeteer from '../../../../../lib/puppeteer/puppeteer.js'
import YAML from 'yaml'
import { _path } from '../../../model/path.js'

// 冷却时间管理
let CD = {}

export class starrailrelife extends plugin {
  constructor () {
    super({
      name: '星铁抽卡插件转生',
      dsc: '转生成星穹铁道中的角色',
      event: 'message',
      priority: 1680,
      rule: [
        {
          reg: '^#*(星铁)?转生$',
          fnc: 'relife'
        }
      ]
    })
  }

  // 获取配置
  get appconfig () { return setting.getConfig('gacha') }

  async relife (e) {
    // 校验冷却时间
    let cdtime = this.appconfig.relifeCD
    if (CD[e.user_id] && !e.isMaster) {
      e.reply(`每${cdtime}分钟只能转生一次哦！`)
      return true
    }
    
    // 设置冷却时间
    CD[e.user_id] = true
    setTimeout(() => {
      delete CD[e.user_id]
    }, cdtime * 60 * 1000)

    try {
      // 读取角色数据
      let identities = YAML.parse(fs.readFileSync(`${modResources}/yaml/identity.yaml`, 'utf-8'))
      let identityKeys = Object.keys(identities)
      let randomKey = identityKeys[Math.floor(Math.random() * identityKeys.length)]
      let identity = identities[randomKey]

      // 获取颜色配置
      let colorData = YAML.parse(fs.readFileSync(`${modResources}/yaml/color.yaml`, 'utf-8'))
      let elemName = identity.elem
      let color = colorData[elemName]

      // 构建立绘路径
      let splashPath = `meta-sr/character/${identity.name}/imgs/splash.webp`
      let fullPath = `${_path}/plugins/miao-plugin/resources/${splashPath}`
      let splashImage = fs.existsSync(fullPath) ? splashPath : "img/bg/card-bg.png"

      // 生成转生图片
      let base64 = await puppeteer.screenshot('flower-plugin', {
        tplFile: './plugins/flower-plugin/GachaMOD/StarRail/resources/html/relife/relife.html',
        pluResPath: `${modResources}/`,
        miaoResPath: `${_path}/plugins/miao-plugin/resources/`,
        saveId: 'starrailrelife',
        imgType: 'png',
        // 角色基本信息
        name: identity.name,
        elemName: elemName,
        // 用户基本信息
        nickname: e.sender?.nickname || "开拓者",
        userId: e.user_id,
        userIcon: `http://q2.qlogo.cn/headimg_dl?dst_uin=${e.user_id}&spec=5`,
        // 角色详细信息（来自identity.yaml）
        allegiance: identity.allegiance,
        type: identity.type,
        desc: identity.desc,
        color,
        // 图片资源
        imgs: {
          card: "img/bg/bg.png",
          splash: splashImage
        }
      })
      
      return e.reply(base64)
    } catch (error) {
      logger.error('[星铁转生] 生成图片失败:', error)
      e.reply('转生生成图片失败，请稍后重试~')
      return true
    }
  }
}