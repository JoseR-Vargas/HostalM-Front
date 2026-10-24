import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DataTable, Td, Tr } from './DataTable';

afterEach(cleanup);

describe('DataTable', () => {
  it('renders the Preline table recipe and keeps the ids and hook classes', () => {
    const { container } = render(
      <DataTable containerId="box" id="tabla" bodyId="cuerpo" columns={['Nombre', 'Monto']}>
        <Tr>
          <Td label="Nombre">Ana</Td>
          <Td label="Monto" wrap>
            1.000
          </Td>
        </Tr>
      </DataTable>,
    );

    const box = container.querySelector('#box');
    expect(box.classList.contains('table-container')).toBe(true);
    expect(box.classList.contains('min-w-full')).toBe(true);
    expect(box.firstChild.getAttribute('class')).toContain(
      'border border-table-line overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
    );
    expect(container.querySelector('#tabla').getAttribute('class')).toContain('min-w-full divide-y divide-table-line');
    expect(container.querySelector('#cuerpo').getAttribute('class')).toBe('divide-y divide-table-line');
    expect(container.querySelector('thead th').getAttribute('class')).toBe(
      'px-6 py-3 text-start text-xs font-medium text-muted-foreground-1 uppercase',
    );

    const [name, amount] = container.querySelectorAll('td');
    expect(name.getAttribute('class')).toContain('px-6 py-4 whitespace-nowrap text-sm text-foreground first:font-medium');
    expect(name.getAttribute('data-label')).toBe('Nombre');
    expect(name.getAttribute('class')).not.toContain('whitespace-normal');
    expect(amount.getAttribute('class')).toContain('whitespace-normal!');
  });
});
