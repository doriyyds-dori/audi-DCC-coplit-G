import { HelpCircle, RotateCcw } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand text-white">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">邀约话术助手 - 使用手册</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <RotateCcw className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-gray-600 space-y-8">
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">1</span>
              快速上手指南
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-bold text-gray-800 mb-1 text-sm">主流程通话</p>
                <p className="text-xs">选择左上角客户类型，跟随左侧建议话术。点击紫色按钮反馈，系统自动进入下一阶段。</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-bold text-gray-800 mb-1 text-sm">应对突发提问</p>
                <p className="text-xs">客户问及价格、配置时，使用右侧FAQ菜单。三级分类精准定位，点击即出标准答案。</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">2</span>
              话术编写规范 (CSV)
            </h3>
            <div className="space-y-3">
              <div className="border-l-4 border-brand pl-4 py-1">
                <p className="text-sm font-bold text-gray-800">常见问题 (FAQ) 规范：</p>
                <p className="text-xs mt-1">匹配键 (CustomerOption) 必须为 <b>一级分类_二级分类_问题</b> 格式。例如：<code className="bg-gray-100 px-1">产品卖点_外观_灯语</code></p>
              </div>
              <div className="border-l-4 border-emerald-500 pl-4 py-1">
                <p className="text-sm font-bold text-gray-800">主流程规范：</p>
                <p className="text-xs mt-1">通过 <b>StepId</b> 和 <b>NextStepId</b> 实现逻辑跳转。确保跳转目标ID在表格中真实存在。</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center text-sm">3</span>
              更新与分发流程
            </h3>
            <ol className="list-decimal list-inside text-sm space-y-2 ml-2">
              <li>点击 <b>下载模板</b>，使用Excel编辑并保存为CSV格式。</li>
              <li>点击 <b>上传常见话术</b> 或 <b>流程话术</b> 进行更新。</li>
              <li>点击 <b>下载离线版</b> 生成最新的 HTML 独立文件。</li>
              <li>将该文件发给团队成员，双击即可离线使用最新话术。</li>
            </ol>
          </section>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-800 text-xs">
            <b>💡 核心提示：</b> 离线版具备"内置记忆"。主管更新后分发新文件，员工打开即是最新版。若需清空本地缓存，请点击红色的"重置系统"。
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-brand text-white rounded-xl font-bold hover:bg-brand-hover transition-colors">
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
