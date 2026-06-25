import { useForm } from 'react-hook-form';
import { ORDER_STATUSES } from '../../utils/constants';
import Spinner from '../ui/Spinner';

export default function OrderForm({ initial, onSave, onCancel, loading }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initial ? {
      customer:   initial.customer,
      product:    initial.product,
      orderedCode:initial.orderedCode,
      qty:        initial.qty,
      vendor:     initial.vendor,
      orderDate:  initial.orderDate?.slice(0,10),
      eta:        initial.eta,
      status:     initial.status,
      notes:      initial.notes,
      purchaseRate: initial.purchaseRate,
      sellingRate:  initial.sellingRate,
    } : { orderDate: new Date().toISOString().slice(0,10), status: 'Order' },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Customer *</label>
          <input className="input" placeholder="Customer name" {...register('customer', { required: 'Required' })} />
          {errors.customer && <p className="text-red-500 text-xs mt-1">{errors.customer.message}</p>}
        </div>
        <div>
          <label className="label">Product *</label>
          <input className="input" placeholder="Product name" {...register('product', { required: 'Required' })} />
          {errors.product && <p className="text-red-500 text-xs mt-1">{errors.product.message}</p>}
        </div>
        <div>
          <label className="label">Product Code</label>
          <input className="input" placeholder="SKU / Code" {...register('orderedCode')} />
        </div>
        <div>
          <label className="label">Qty *</label>
          <input type="number" className="input" placeholder="0" {...register('qty', { required: 'Required', min: 1 })} />
          {errors.qty && <p className="text-red-500 text-xs mt-1">{errors.qty.message}</p>}
        </div>
        <div>
          <label className="label">Vendor / Supplier</label>
          <input className="input" placeholder="Supplier name" {...register('vendor')} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...register('status')}>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Order Date</label>
          <input type="date" className="input" {...register('orderDate')} />
        </div>
        <div>
          <label className="label">ETA</label>
          <input type="date" className="input" {...register('eta')} />
        </div>
        <div>
          <label className="label">Purchase Rate</label>
          <input type="number" className="input" placeholder="0" {...register('purchaseRate')} />
        </div>
        <div>
          <label className="label">Selling Rate</label>
          <input type="number" className="input" placeholder="0" {...register('sellingRate')} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} placeholder="Any notes…" {...register('notes')} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? <Spinner size="sm" /> : (initial ? 'Update Order' : 'Create Order')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
