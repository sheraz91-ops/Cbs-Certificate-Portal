import { parseMatrixSelection } from "@/lib/matrixRegistration";

export function RegistrationMatrixField({
  label,
  fieldKey,
  rows,
  columns,
  selectionMode = "single",
  value,
  required,
  onChange,
}: {
  label: string;
  fieldKey: string;
  rows: string[];
  columns: string[];
  selectionMode?: "single" | "multiple";
  value: string;
  required: boolean;
  onChange: (value: string) => void;
}) {
  const selected = parseMatrixSelection(value);
  const update = (row: string, column: string, checked: boolean) => {
    const current = selected[row] ?? [];
    const next =
      selectionMode === "single"
        ? checked
          ? [column]
          : current.filter((item) => item !== column)
        : checked
          ? [...current, column]
          : current.filter((item) => item !== column);
    const result = { ...selected };
    if (next.length) result[row] = next;
    else delete result[row];
    onChange(JSON.stringify(result));
  };

  return (
    <fieldset className="mt-2 w-full min-w-0 rounded-xl border border-navy-200 bg-white p-3 sm:p-4">
      <legend className="px-1 text-sm font-medium text-navy-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </legend>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-left text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="min-w-36 px-2 py-2 text-xs font-medium text-navy-500"
              >
                &nbsp;
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="min-w-24 px-2 py-2 text-center text-xs font-medium text-navy-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row} className="bg-navy-50">
                <th
                  scope="row"
                  className="rounded-l-lg px-2 py-3 font-medium text-navy-800"
                >
                  {row}
                </th>
                {columns.map((column, columnIndex) => {
                  const id = `matrix-${fieldKey}-${rowIndex}-${columnIndex}`;
                  const checked = (selected[row] ?? []).includes(column);
                  return (
                    <td
                      key={column}
                      className={`px-2 py-3 text-center ${columnIndex === columns.length - 1 ? "rounded-r-lg" : ""}`}
                    >
                      <input
                        id={id}
                        type={selectionMode === "single" ? "radio" : "checkbox"}
                        name={
                          selectionMode === "single"
                            ? `matrix-${fieldKey}-${rowIndex}`
                            : undefined
                        }
                        checked={checked}
                        onChange={(event) =>
                          update(row, column, event.target.checked)
                        }
                        aria-label={`${row}: ${column}`}
                        className="h-4 w-4 accent-indigo-600"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.keys(selected).length > 0 && (
        <button
          type="button"
          onClick={() => onChange("{}")}
          className="mt-2 block w-full text-right text-xs font-medium text-navy-600 underline underline-offset-2 hover:text-navy-900"
        >
          Clear selection
        </button>
      )}
      {required && (
        <p className="mt-2 text-xs font-normal text-navy-500">
          Choose an answer in every row.
        </p>
      )}
    </fieldset>
  );
}
