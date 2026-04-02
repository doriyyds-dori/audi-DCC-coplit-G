import { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { FileText, Loader2, Plus, Pencil, Eye, X, Save, Power, PowerOff, CheckCircle2, AlertTriangle, Copy, Download, FileInput, Upload } from 'lucide-react';
import { validateScriptCsv, CSV_EXAMPLE, copyTemplate, downloadTemplate, readCsvFile } from '../csvValidation';

// ============================================================
// 类型与映射
// ============================================================

interface StoreScript {
  scriptId: string;
  name: string;
  scenarioType: string;
  storeId: string;
  sourceScriptId: string;
  sourceScriptName?: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
}

interface StoreScriptDetail extends StoreScript {
  content: string;
  sourceScriptName?: string;
}

interface GlobalScriptOption {
  scriptId: string;
  name: string;
  scenarioType: string;
  enabled: number;
}

const SCENARIO_LABEL: Record<string, string> = {
  existing: '保有客户',
  new: '新客户',
};

type ModalMode = 'view' | 'edit' | 'create';

// ============================================================
// 组件
// ============================================================

export default function AdminScriptsStore() {
  const { getToken } = useAuth();
  const [scripts, setScripts] = useState<StoreScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [viewScenario, setViewScenario] = useState('');
  const [viewSourceId, setViewSourceId] = useState('');
  const [viewSourceName, setViewSourceName] = useState('');

  // Create-specific: source script dropdown
  const [globalScripts, setGlobalScripts] = useState<GlobalScriptOption[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const text = await readCsvFile(file);
      if (!text.trim()) { setModalError('导入的文件内容为空'); return; }
      if (formContent.trim() && !confirm('当前编辑框已有内容，导入将覆盖现有内容，确定继续吗？')) return;
      setFormContent(text);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '文件读取失败');
    }
  };

  const headers = useCallback((): Record<string, string> => {
    const token = getToken();
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }, [getToken]);

  // ==================== 列表 ====================
  const fetchList = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/admin/scripts/store', { headers: headers() })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) setScripts(json.scripts);
        else setError(json.error || '加载失败');
      })
      .catch(() => setError('网络异常，话术列表加载失败'))
      .finally(() => setLoading(false));
  }, [headers]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ==================== 加载全局话术（用于创建） ====================
  const fetchGlobalScripts = () => {
    setLoadingGlobal(true);
    fetch('/api/admin/scripts/global', { headers: headers() })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          const enabled = (json.scripts as GlobalScriptOption[]).filter((s) => s.enabled !== 0);
          setGlobalScripts(enabled);
          if (enabled.length > 0) setSelectedSourceId(enabled[0].scriptId);
        }
      })
      .catch(() => { /* silently fail, user sees empty dropdown */ })
      .finally(() => setLoadingGlobal(false));
  };

  // ==================== 查看详情 ====================
  const openView = (scriptId: string) => {
    setModalMode('view');
    setEditingScriptId(scriptId);
    setModalLoading(true);
    setModalError('');
    fetch(`/api/admin/scripts/store/${scriptId}`, { headers: headers() })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          const s = json.script as StoreScriptDetail;
          setFormName(s.name);
          setFormContent(s.content);
          setViewScenario(s.scenarioType);
          setViewSourceId(s.sourceScriptId);
          setViewSourceName(s.sourceScriptName || '');
        } else setModalError(json.error || '加载失败');
      })
      .catch(() => setModalError('网络异常'))
      .finally(() => setModalLoading(false));
  };

  // ==================== 编辑 ====================
  const openEdit = (scriptId: string) => {
    setModalMode('edit');
    setEditingScriptId(scriptId);
    setModalLoading(true);
    setModalError('');
    fetch(`/api/admin/scripts/store/${scriptId}`, { headers: headers() })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.success) {
          const s = json.script as StoreScriptDetail;
          setFormName(s.name);
          setFormContent(s.content);
          setViewScenario(s.scenarioType);
          setViewSourceId(s.sourceScriptId);
          setViewSourceName(s.sourceScriptName || '');
        } else setModalError(json.error || '加载失败');
      })
      .catch(() => setModalError('网络异常'))
      .finally(() => setModalLoading(false));
  };

  // ==================== 新增 ====================
  const openCreate = () => {
    setModalMode('create');
    setEditingScriptId(null);
    setFormName('');
    setFormContent('');
    setViewScenario('');
    setViewSourceId('');
    setSelectedSourceId('');
    setModalLoading(false);
    setModalError('');
    fetchGlobalScripts();
  };

  // ==================== 关闭弹窗 ====================
  const closeModal = () => {
    setModalMode(null);
    setEditingScriptId(null);
    setModalError('');
  };

  // ==================== CSV 校验 ====================
  const csvValidation = useMemo(() => {
    if (modalMode !== 'edit' || !formContent.trim()) return null;
    return validateScriptCsv(formContent);
  }, [formContent, modalMode]);

  // ==================== 保存 ====================
  const handleSave = async () => {
    setSubmitting(true);
    setModalError('');
    try {
      let res: Response;
      if (modalMode === 'create') {
        if (!selectedSourceId) {
          setModalError('请选择来源统一话术');
          setSubmitting(false);
          return;
        }
        const body = JSON.stringify({
          sourceScriptId: selectedSourceId,
          name: formName.trim() || undefined,
        });
        res = await fetch('/api/admin/scripts/store', { method: 'POST', headers: headers(), body });
      } else {
        if (!formName.trim()) {
          setModalError('请填写话术名称');
          setSubmitting(false);
          return;
        }
        if (formContent.trim() && csvValidation && !csvValidation.valid) {
          setModalError('CSV 校验未通过，请先修正话术内容');
          setSubmitting(false);
          return;
        }
        const body = JSON.stringify({ name: formName.trim(), content: formContent });
        res = await fetch(`/api/admin/scripts/store/${editingScriptId}`, { method: 'PUT', headers: headers(), body });
      }
      const json = await res.json();
      if (res.ok && json.success) {
        closeModal();
        fetchList();
      } else {
        setModalError(json.error || '保存失败');
      }
    } catch {
      setModalError('网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 启用/禁用 ====================
  const toggleEnabled = async (scriptId: string, currentEnabled: number) => {
    try {
      const res = await fetch(`/api/admin/scripts/store/${scriptId}/enabled`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ enabled: currentEnabled !== 1 }),
      });
      const json = await res.json();
      if (res.ok && json.success) fetchList();
      else alert(json.error || '操作失败');
    } catch {
      alert('网络异常');
    }
  };

  // ==================== 渲染 ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
        <span className="ml-2 text-sm text-gray-400">加载中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={fetchList} className="text-xs font-bold text-brand hover:underline">刷新重试</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-gray-900">门店自定义话术</h2>
          <span className="text-sm text-gray-400 ml-2">共 {scripts.length} 条</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />基于统一话术创建
        </button>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">话术名称</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">场景</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">状态</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">来源统一话术</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">更新时间</th>
              <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {scripts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-300 text-xs">暂无门店自定义话术</td>
              </tr>
            ) : (
              scripts.map((s) => (
                <tr key={s.scriptId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-800 text-xs font-bold">{s.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">
                      {SCENARIO_LABEL[s.scenarioType] ?? s.scenarioType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.enabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {s.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.sourceScriptName
                      ? <span className="text-gray-700 font-bold">{s.sourceScriptName}</span>
                      : <span className="text-gray-400 font-mono">{s.sourceScriptId || '—'}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openView(s.scriptId)} className="text-gray-400 hover:text-brand transition-colors" title="查看">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(s.scriptId)} className="text-gray-400 hover:text-brand transition-colors" title="编辑">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleEnabled(s.scriptId, s.enabled)}
                        className={`transition-colors ${s.enabled ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}
                        title={s.enabled ? '禁用' : '启用'}
                      >
                        {s.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-bold text-gray-900">
                {modalMode === 'create' ? '基于统一话术创建自定义话术' : modalMode === 'edit' ? '编辑门店话术' : '查看门店话术'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-brand animate-spin" />
                  <span className="ml-2 text-sm text-gray-400">加载中…</span>
                </div>
              ) : modalMode === 'create' ? (
                <>
                  {/* 选择来源统一话术 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">来源统一话术</label>
                    {loadingGlobal ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                        <span className="text-xs text-gray-400">加载统一话术列表…</span>
                      </div>
                    ) : globalScripts.length === 0 ? (
                      <p className="text-xs text-red-500">暂无可用的统一话术，请先在「统一话术管理」中创建</p>
                    ) : (
                      <select
                        value={selectedSourceId}
                        onChange={(e) => setSelectedSourceId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      >
                        {globalScripts.map((g) => (
                          <option key={g.scriptId} value={g.scriptId}>
                            {g.name}（{SCENARIO_LABEL[g.scenarioType] ?? g.scenarioType}）
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 自定义名称（可选） */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">自定义名称（可留空，默认使用来源名称）</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      placeholder="留空则自动生成"
                    />
                  </div>
                  <p className="text-xs text-gray-400">创建后会自动复制统一话术的内容，之后可在门店范围内自由编辑。</p>
                </>
              ) : (
                <>
                  {/* 查看/编辑模式 */}
                  {/* 场景（只读） */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">适用场景</label>
                    <p className="text-sm text-gray-800">{SCENARIO_LABEL[viewScenario] ?? viewScenario}</p>
                  </div>

                  {/* 来源话术（只读） */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">来源统一话术</label>
                    {viewSourceName
                      ? <p className="text-sm text-gray-800">{viewSourceName} <span className="text-xs text-gray-400 font-mono ml-1">{viewSourceId}</span></p>
                      : <p className="text-sm text-gray-500 font-mono">{viewSourceId || '—'}</p>}
                  </div>

                  {/* 名称 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">话术名称</label>
                    {modalMode === 'view' ? (
                      <p className="text-sm text-gray-800">{formName}</p>
                    ) : (
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        placeholder="请输入话术名称"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">话术内容（CSV 格式）</label>
                    {modalMode === 'view' ? (
                      <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-100">
                        {formContent || '（空）'}
                      </pre>
                    ) : (
                      <>
                        {/* 填写说明 */}
                        <details className="mb-2 rounded-lg border border-blue-100 bg-blue-50/50">
                          <summary className="px-3 py-2 text-xs font-bold text-blue-700 cursor-pointer select-none hover:text-blue-800">{'📋 填写说明与标准示例（点击展开）'}</summary>
                          <div className="px-3 pb-3 space-y-2 text-xs text-gray-600">
                            <div>
                              <p className="font-bold text-gray-700 mb-1">{'必填列说明：'}</p>
                              <ul className="space-y-0.5 ml-3">
                                <li>{'• Phase（步骤阶段名）— 同一阶段的多行共享相同的 Phase，如"开场白""了解需求"'}</li>
                                <li>{'• StepId（步骤编号）— 每个阶段的唯一标识，如 step_open、step_need'}</li>
                                <li>{'• CustomerOption（客户可能的回答）— 客户在此步骤可能说的话'}</li>
                                <li>{'• AgentResponse（顾问应对话术）— 对应客户回答的推荐话术'}</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-bold text-gray-700 mb-1">{'可选列：CoreLogic、AgentScript、NextStepId'}</p>
                            </div>
                            <div>
                              <p className="font-bold text-gray-700 mb-1">{'理解要点：'}</p>
                              <ul className="space-y-0.5 ml-3">
                                <li>{'• 每一行 = 一个客户可能的回答 + 对应的顾问话术'}</li>
                                <li>{'• 同一 Phase 下可以有多行（代表客户的不同回答分支）'}</li>
                                <li>{'• 门店话术基于统一话术创建后可自由调整内容'}</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-bold text-gray-700 mb-1">{'标准示例（可直接复制粘贴）：'}</p>
                              <pre className="text-xs bg-white rounded-lg p-2 border border-gray-200 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto font-mono text-gray-700 select-all">{CSV_EXAMPLE}</pre>
                            </div>
                          </div>
                        </details>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={async () => { await copyTemplate(); setCopyStatus('已复制'); setTimeout(() => setCopyStatus(''), 2000); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Copy className="w-3 h-3" />{copyStatus || '复制标准模板'}
                          </button>
                          <button
                            type="button"
                            onClick={downloadTemplate}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Download className="w-3 h-3" />{'下载标准模板 CSV'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (formContent.trim() && !confirm('当前编辑框已有内容，使用标准模板将覆盖现有内容，确定继续吗？')) return;
                              setFormContent(CSV_EXAMPLE);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <FileInput className="w-3 h-3" />{'使用标准模板'}
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <Upload className="w-3 h-3" />{'导入本地 CSV'}
                          </button>
                          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
                        </div>
                        <textarea
                          value={formContent}
                          onChange={(e) => setFormContent(e.target.value)}
                          rows={12}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-y"
                          placeholder={'请编辑 CSV 格式话术内容（必须包含 Phase, StepId, CustomerOption, AgentResponse 列）'}
                        />
                        {/* CSV 解析预览 */}
                        {formContent.trim() && csvValidation && (
                          <div className={`mt-2 rounded-lg border p-3 text-xs ${csvValidation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {csvValidation.valid
                                ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="font-bold text-green-700">解析成功</span></>
                                : <><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="font-bold text-red-600">解析失败</span></>}
                            </div>
                            {csvValidation.valid ? (
                              <div className="space-y-0.5 text-gray-600">
                                <p>共解析出 <span className="font-bold text-gray-800">{csvValidation.stepCount}</span> 个步骤：{csvValidation.phases.join('、')}</p>
                                <p>首条回复：<span className="text-gray-500">{csvValidation.firstOpening}</span></p>
                              </div>
                            ) : (
                              <ul className="space-y-0.5 text-red-600">
                                {csvValidation.errors.map((e, i) => <li key={i}>• {e}</li>)}
                              </ul>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {modalError && (
                <p className="text-xs text-red-500 text-center">{modalError}</p>
              )}
            </div>

            {/* 弹窗底部 */}
            {modalMode !== 'view' && !modalLoading && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {modalMode === 'create' ? (submitting ? '创建中…' : '创建') : (submitting ? '保存中…' : '保存')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
