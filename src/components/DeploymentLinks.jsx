import React, { useMemo } from 'react'

export default function DeploymentLinks() {
  const urls = useMemo(() => {
    const projectUrl = import.meta?.env?.VITE_VERCEL_PROJECT_URL || import.meta?.env?.NEXT_PUBLIC_VERCEL_PROJECT_URL || ''
    // Generic fallbacks if project-specific URL isn't provided
    const dashboard = projectUrl || 'https://vercel.com/dashboard'
    const deployments = projectUrl ? `${projectUrl.replace(/\/?$/, '')}/deployments` : 'https://vercel.com/dashboard/deployments'
    return { dashboard, deployments }
  }, [])

  return (
    <div className="text-[11px] text-slate-500 border rounded-md p-2 bg-slate-50">
      <div className="font-medium text-slate-700 mb-1">Deployment</div>
      <div className="flex items-center gap-2">
        <a className="underline hover:text-slate-800" href={urls.dashboard} target="_blank" rel="noreferrer">Vercel Dashboard</a>
        <span className="text-slate-400">•</span>
        <a className="underline hover:text-slate-800" href={urls.deployments} target="_blank" rel="noreferrer">Deployments</a>
      </div>
    </div>
  )
}

