import {WikiDoc} from "@/types";

export function Wiki({ data }: { data: WikiDoc }) {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{data.repo.owner}</span>
          <span>/</span>
          <span className="font-semibold text-gray-900">{data.repo.name}</span>
        </div>
        <h1 className="text-4xl font-bold">{data.repo.name} Documentation</h1>
        <p className="text-lg text-gray-600">{data.repo.description}</p>
        <div className="text-sm text-gray-500">
          Commit: <code className="bg-gray-100 px-2 py-1 rounded">{data.repo.sha.slice(0, 7)}</code>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-12">
        {data.features.map((feature) => (
          <div key={feature.id} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{feature.title}</h2>
              <p className="text-gray-700">{feature.description}</p>
            </div>

            {/* Overview */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h3 className="font-semibold text-lg mb-2">Overview</h3>
              <p className="text-gray-700">{feature.sections.overview.text}</p>
            </div>

            {/* Public Interfaces */}
            {feature.sections.public_interfaces.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Public Interfaces</h3>
                <div className="space-y-3">
                  {feature.sections.public_interfaces.map((iface, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          {iface.type}
                        </span>
                        {iface.name && <code className="font-mono text-sm font-semibold">{iface.name}</code>}
                      </div>
                      {iface.signature && (
                        <code className="block bg-gray-100 p-2 rounded text-sm mb-2">{iface.signature}</code>
                      )}
                      {iface.description && <p className="text-gray-700 text-sm">{iface.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Flows */}
            {feature.sections.key_flows.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Key Flows</h3>
                <div className="space-y-4">
                  {feature.sections.key_flows.map((flow, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <h4 className="font-semibold mb-3">{flow.title}</h4>
                      <ol className="space-y-2 list-decimal list-inside">
                        {flow.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="text-gray-700 text-sm">
                            {step.text}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {feature.sections.dependencies.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Dependencies</h3>
                <div className="grid gap-3">
                  {feature.sections.dependencies.map((dep, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <div className="font-mono text-sm font-semibold mb-1">{dep.name}</div>
                      {dep.purpose && <p className="text-gray-700 text-sm">{dep.purpose}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Files */}
            {feature.sections.key_files.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Key Files</h3>
                <div className="space-y-2">
                  {feature.sections.key_files.map((file, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-white">
                      <code className="text-sm font-semibold text-blue-600">{file.path}</code>
                      {file.role && <p className="text-gray-700 text-sm mt-1">{file.role}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data and State */}
            {feature.sections.data_and_state.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Data and State</h3>
                <div className="space-y-3">
                  {feature.sections.data_and_state.map((data, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <div className="font-semibold mb-2">{data.entity}</div>
                      {data.fields && data.fields.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Fields: </span>
                          <code className="text-sm">{data.fields.join(', ')}</code>
                        </div>
                      )}
                      {data.storage && (
                        <p className="text-gray-700 text-sm">
                          <span className="font-medium">Storage:</span> {data.storage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limitations */}
            {feature.sections.limitations && feature.sections.limitations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Limitations</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 space-y-2">
                  {feature.sections.limitations.map((limitation, idx) => (
                    <p key={idx} className="text-gray-700 text-sm">
                      • {limitation.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
