import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchOrders, setFilters, setPage, deleteOrder } from '../store/slices/orderSlice';
import { createOrder, updateOrder } from '../store/slices/orderSlice';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { fmtDate, fmtDateShort } from '../utils/helpers';
import { ORDER_STATUSES } from '../utils/constants';
import OrderForm from '../components/orders/OrderForm';
import { useAuth } from '../hooks/useAuth';

export default function Orders() {
  const dispatch = useDispatch();
  const { can }  = useAuth();
  const { items, total, pages, page, loading, filters } = useSelector(s => s.orders);
  const [showForm, setShowForm]     = useState(false);
  const [editOrder, setEditOrder]   = useState(null);

  const load = () => dispatch(fetchOrders({ ...filters, page, limit: 50 }));
  useEffect(() => { load(); }, [filters, page]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    const res = await dispatch(deleteOrder(id));
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Order deleted');
    } else {
      toast.error(res.payload || 'Failed to delete order');
    }
  };

  const handleSave = async (data) => {
    if (editOrder) {
      const res = await dispatch(updateOrder({ id: editOrder._id, data }));
      if (res.meta.requestStatus === 'fulfilled') { toast.success('Order updated'); setShowForm(false); setEditOrder(null); }
      else toast.error(res.payload);
    } else {
      const res = await dispatch(createOrder(data));
      if (res.meta.requestStatus === 'fulfilled') { toast.success('Order created'); setShowForm(false); }
      else toast.error(res.payload);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="ð Orders" actions={
        <>
          <span className="text-xs text-slate-400 font-medium">{total} orders</span>
          {can('createOrder') && (
            <button className="btn-primary btn-sm" onClick={() => { setEditOrder(null); setShowForm(true); }}>+ New Order</button>
          )}
        </>
      } />

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3 flex-wrap">
        <input
          className="input w-56"
          placeholder="Search ordersâ¦"
          value={filters.search}
          onChange={e => dispatch(setFilters({ search: e.target.value }))}
        />
        <select className="input w-44" value={filters.status} onChange={e => dispatch(setFilters({ status: e.target.value }))}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="input w-36" value={filters.from} onChange={e => dispatch(setFilters({ from: e.target.value }))} />
        <input type="date" className="input w-36" value={filters.to}   onChange={e => dispatch(setFilters({ to: e.target.value }))} />
        <button className="btn-secondary btn-sm" onClick={() => dispatch(setFilters({ search:'', status:'', from:'', to:'' }))}>Clear</button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="table-th">DON</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Product</th>
                    <th className="table-th text-center">Qty</th>
                    <th className="table-th">Order Date</th>
                    <th className="table-th">ETA</th>
                    <th className="table-th">Vendor</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(o => (
                    <tr key={o._id} className="table-tr">
                      <td className="table-td">
                        <Link to={`/orders/${o._id}`} className="font-bold text-blue-600 hover:underline">DON-{o.seqId}</Link>
                      </td>
                      <td className="table-td font-semibold max-w-[140px] truncate">{o.customer}</td>
                      <td className="table-td text-slate-500 max-w-[140px] truncate">{o.product}</td>
                      <td className="table-td text-center font-medium">{o.qty}</td>
                      <td className="table-td text-slate-500">{fmtDate(o.orderDate)}</td>
                      <td className="table-td font-medium">{fmtDateShort(o.eta) || 'â'}</td>
                      <td className="table-td text-slate-500 max-w-[120px] truncate">{o.vendor || 'â'}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <Link to={`/orders/${o._id}`} className="btn-icon text-sm" title="View">ð</Link>
                          {can('editOrder') && (
                            <button className="btn-icon text-sm" title="Edit" onClick={() => { setEditOrder(o); setShowForm(true); }}>âï¸</button>
                          )}
                          {can('deleteOrder') && (
                            <button className="btn-icon text-sm text-red-400" title="Delete" onClick={() => handleDelete(o._id)}>ð</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr><td colSpan={9} className="table-td text-center text-slate-400 py-12">No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => dispatch(setPage(page - 1))}>â Prev</button>
            <span className="text-sm text-slate-500">Page {page} of {pages}</span>
            <button className="btn-secondary btn-sm" disabled={page === pages} onClick={() => dispatch(setPage(page + 1))}>Next â</button>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditOrder(null); }}
        title={editOrder ? 'Edit Order' : 'New Order'} size="lg">
        <OrderForm initial={editOrder} onSave={handleSave} onCancel={() => { setShowForm(false); setEditOrder(null); }} />
      </Modal>
    </div>
  );
}
