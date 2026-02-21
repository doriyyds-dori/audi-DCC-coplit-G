
import { CallStage, CallStageConfig, NeedQuestion, ScriptButton, QuickResponseItem } from './types';

export const CAR_SERIES = ['Audi E5', 'Audi E7X', 'A7L', 'A5L', 'Q6'];

/**
 * 异常结案场景：适配现实拨打中的快速挂断、未接通等情况
 */
export const ABNORMAL_SCENARIOS = [
  { id: 'ab_no_answer', label: '未接通/关机', log: '拨打结果：无人接听/客户关机/空号' },
  { id: 'ab_hung_up', label: '快速挂断', log: '通话异常：开场白被挂断/无意沟通' },
  { id: 'ab_no_will', label: '明确无意向', log: '客户拒绝：近期完全不考虑购车，拒绝后续触达' },
  { id: 'ab_bought_other', label: '已购他品', log: '竞争失败：客户反馈已提其他品牌车辆' }
];

/**
 * 通话结果类型：用于最终的数据分类和 AI 计划生成
 */
export type CallOutcome = 'APPOINTED' | 'UNDECIDED' | 'NONE';

export const QUICK_RESPONSES: QuickResponseItem[] = [
  {
    id: 'price_high',
    category: 'PRICE',
    question: '价格太贵了',
    answer: '哥，E5是奥迪全新的800V平台，成本都在看不见的三电和智驾上。现在的预售权益折算下来，光是终身免费充电这就省了小几万呢！',
    models: ['Audi E5']
  },
  {
    id: 'comp_bmw',
    category: 'COMPETITOR',
    question: '在看宝马i5',
    answer: 'i5也是好车，但E5是原生纯电平台，充电快一倍，而且咱们这个59寸大屏和Momenta智驾，比i5超前了一个时代。',
    models: ['Audi E5']
  },
  {
    id: 'brand_logo',
    category: 'BRAND',
    question: '为什么没四环标？',
    answer: 'AUDI字母标是奥迪专门给"智能电动"划分的高端序列。代表的是奥迪最前沿的科技，就像阿玛尼的高端黑标一样。',
    models: ['Audi E5', 'Audi E7X']
  }
];

export const CALL_FLOW_CONFIG: CallStageConfig[] = [
  {
    stage: CallStage.OPENING,
    title: '第一步：破冰开场',
    icon: 'Smile',
    colorTheme: 'bg-blue-50 border-blue-200 text-blue-800',
    items: [
      { id: 'op_std', label: '👋 标准开场', content: '您好{Name}，我是奥迪体验官小王。关注已久的奥迪E5实车到店了，特意通知您！', logSummary: '执行：标准开场' },
      { id: 'op_act', label: '🎁 活动邀约', content: '您好{Name}，这周末店里有E5赛道日活动，想邀请您带家人一起来体验3.4秒加速。', logSummary: '执行：活动邀约开场' }
    ]
  },
  {
    stage: CallStage.DISCOVERY,
    title: '第二步：需求摸底',
    icon: 'Search',
    colorTheme: 'bg-purple-50 border-purple-200 text-purple-800',
    items: [
      {
        id: 'q_usage',
        question: '谁开/怎么用？',
        scriptHint: '这车买回去主要是您自己上下班代步，还是周末带家里人出去玩多一些？',
        options: [{ label: '通勤代步', value: '通勤' }, { label: '家庭出游', value: '家庭' }],
        isProfile: true
      },
      {
        id: 'q_pain',
        question: '最在意什么？',
        scriptHint: '您买电车最担心什么？是续航充电，还是怕车机不好用？',
        options: [{ label: '续航', value: '续航' }, { label: '智驾', value: '智驾' }],
        isProfile: true
      }
    ]
  },
  {
    stage: CallStage.PITCH,
    title: '第三步：卖点出击',
    icon: 'Zap',
    colorTheme: 'bg-amber-50 border-amber-200 text-amber-800',
    items: [
      { id: 'pt_ext_1', category: '静态外观', label: '🎨 封闭式前脸', content: 'E5采用了奥迪最新的封闭式前脸设计，配上AUDI字母标，非常有未来感，走在街上回头率极高。', logSummary: '推介：静态外观-封闭式前脸' },
      { id: 'pt_ext_2', category: '静态外观', label: '💡 智能灯光', content: '奥迪是灯厂，E5的智能灯光系统可以自定义灯语，非常有仪式感。', logSummary: '推介：静态外观-智能灯光' },
      { id: 'pt_spa_1', category: '车辆空间', label: '📏 纯电平台空间', content: '得益于原生纯电平台，E5的轴距非常长，后排空间比同级别的燃油车大得多，全家出行非常舒适。', logSummary: '推介：车辆空间-后排空间' },
      { id: 'pt_int_1', category: '座舱交互', label: '🖥️ 59寸大屏', content: '看看E5这个59寸5K大屏，副驾看电影不影响主驾，孩子后排也能投屏。', logSummary: '推介：座舱交互-59寸大屏' },
      { id: 'pt_com_1', category: '豪华舒适', label: '🛋️ 零重力座椅', content: '咱们这车配了零重力座椅，午休或者长途驾驶累了，一键躺平，非常解乏。', logSummary: '推介：豪华舒适-零重力座椅' },
      { id: 'pt_dyn_1', category: '动态试驾', label: '🏎️ 3.4秒加速', content: '双电机四驱版加速只要3.4秒，这种推背感您一定要来试驾体验一下。', logSummary: '推介：动态试驾-加速性能' },
      { id: 'pt_pow_1', category: '补能和三电', label: '⚡ 800V超充', content: 'E5是800V平台的，充电10分钟就能跑370公里，上个洗手间的功夫电就充好了。', logSummary: '推介：补能和三电-800V超充' },
      { id: 'pt_pow_2', category: '补能和三电', label: '🔋 续航里程', content: 'CLTC续航达到了700公里以上，平时上下班半个月充一次电就够了。', logSummary: '推介：补能和三电-续航里程' },
      { id: 'pt_drv_1', category: '智能驾驶', label: '🤖 Momenta智驾', content: '咱们用的是Momenta的高阶智驾方案，城市领航、自动泊车都非常丝滑，开起来特别省心。', logSummary: '推介：智能驾驶-Momenta智驾' }
    ]
  },
  {
    stage: CallStage.CLOSING,
    title: '第四步：邀约锁定',
    icon: 'CalendarCheck',
    colorTheme: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    items: [
      { id: 'cl_time', label: '📅 二选一邀约', content: '那您看您是周六上午有空，还是周日下午方便一点？我好给您预留试驾车。', logSummary: '动作：二选一邀约' },
      { id: 'cl_wx', label: '💬 加微话术', content: '具体的配置表我通过微信发给您吧？我手机号就是微信号，我现在加您。', logSummary: '动作：加微信' }
    ]
  }
];

export const DOJO_SYSTEM_INSTRUCTION = `
你扮演陈先生，45岁宝马5系车主。对奥迪E5持怀疑态度，挑剔但有礼貌。回复简短（50字内）。
`;

export const SLCR_DATA = [
  { name: '王俊杰', value: 85 },
  { name: '李思思', value: 72 },
  { name: '张伟', value: 65 },
  { name: '赵敏', value: 58 },
  { name: '刘洋', value: 45 }
];

export const SCATTER_DATA = [
  { x: 12, y: 15, z: 200, name: '顾问 A' },
  { x: 28, y: 32, z: 400, name: '顾问 B' },
  { x: 45, y: 55, z: 300, name: '顾问 C' },
  { x: 65, y: 78, z: 150, name: '顾问 D' }
];
