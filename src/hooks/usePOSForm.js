import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { crearVenta } from '../api/ventas.api';
import { useAuth } from '../context/AuthContext';
import { useCaja } from '../context/CajaContext';
import { useToast } from '../components/Toast/Toast';

export function usePOSForm() {
  const { user }      = useAuth();
  const { cajaActiva } = useCaja();
  const toast         = useToast();
  const qc            = useQueryClient();
  const [eanQuery, setEanQuery] = useState('');

  const form = useForm({
    defaultValues: {
      tipo:             'pos',          // 'pos' | 'fe'
      forma_pago:       'efectivo',     // 'efectivo' | 'tarjeta' | 'transferencia'
      valor_recibido:   '',
      items:            [],
      ean_busqueda:     '',
      cliente_tipo_doc: 'CC',
      cliente_numero:   '',
      cliente_factus:   null,           // objeto completo devuelto por Factus/DIAN
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items          = useWatch({ control: form.control, name: 'items',          defaultValue: [] });
  const forma_pago     = useWatch({ control: form.control, name: 'forma_pago' });
  const valor_recibido = useWatch({ control: form.control, name: 'valor_recibido' });
  const tipo           = useWatch({ control: form.control, name: 'tipo' });

  // Sin IVA — no somos responsables de IVA
  const total  = items.reduce((acc, it) => acc + (Number(it.precio) * Number(it.cantidad || 1)), 0);
  const cambio = forma_pago === 'efectivo' && valor_recibido
    ? Math.max(0, Number(String(valor_recibido).replace(/\./g, '')) - total)
    : 0;

  const agregarItem = (producto) => {
    if (!producto) return;
    const idx = fields.findIndex((f) => f.ean === producto.ean);
    if (idx >= 0) {
      update(idx, { ...fields[idx], cantidad: Number(fields[idx].cantidad) + 1 });
    } else {
      append({
        ean:      producto.ean,
        nombre:   producto.nombre,
        precio:   producto.precio_venta ?? producto.precio,
        cantidad: 1,
      });
    }
    form.setValue('ean_busqueda', '');
    setEanQuery('');
  };

  const mutation = useMutation(crearVenta, {
    onSuccess: () => {
      toast.success('Venta registrada correctamente');
      form.reset();
      qc.invalidateQueries(['ventas']);
      qc.invalidateQueries(['cajas']);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error ?? 'Error al registrar la venta';
      toast.error(msg);
    },
  });

  const onCobrar = form.handleSubmit((values) => {
    if (!values.items.length) {
      toast.warning('Agrega al menos un producto');
      return;
    }
    if (!cajaActiva?.id) {
      toast.error('No hay caja abierta. Abre una caja antes de vender.');
      return;
    }

    if (values.forma_pago === 'efectivo') {
      const valorNum = Number(String(values.valor_recibido).replace(/\./g, '')) || 0;
      if (!values.valor_recibido || valorNum <= 0) {
        toast.warning('Ingresa el valor recibido en efectivo.');
        return;
      }
      if (valorNum < total) {
        toast.warning(`El valor recibido ($${valorNum.toLocaleString('es-CO')}) es menor al total ($${total.toLocaleString('es-CO')}).`);
        return;
      }
    }

    // Siempre se registra el TOTAL de la venta, no lo que entregó el cliente
    // El cambio es solo informativo para el cajero
    const valor_efectivo      = values.forma_pago === 'efectivo'      ? total : 0;
    const valor_tarjeta       = values.forma_pago === 'tarjeta'       ? total : 0;
    const valor_transferencia = values.forma_pago === 'transferencia' ? total : 0;

    const body = {
      tienda_id:            user?.tienda_id,
      caja_id:              cajaActiva.id,
      forma_pago:           values.forma_pago,
      valor_efectivo,
      valor_tarjeta,
      valor_transferencia,
      tipo_documento:       values.tipo,   // 'pos' | 'fe'
      items: values.items.map((it) => ({
        ean:      it.ean,
        cantidad: Number(it.cantidad),
      })),
    };

    // Datos extra solo para Factura Electrónica
    if (values.tipo === 'fe') {
      body.numbering_range_id = Number(import.meta.env.VITE_FACTUS_FE_RANGE_ID || 8);
      body.cliente_factus     = values.cliente_factus;
    }

    mutation.mutate(body);
  });

  return {
    form,
    fields,
    remove,
    update,
    items,
    total,
    cambio,
    forma_pago,
    tipo,
    agregarItem,
    onCobrar,
    isLoading:   mutation.isLoading,
    lastVentaId: mutation.data?.venta_id,
    eanQuery,
    setEanQuery,
  };
}
