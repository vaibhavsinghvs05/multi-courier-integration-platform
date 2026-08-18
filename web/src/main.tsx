import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const base =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const address = (name: string) => ({
  name,
  addressLine1: '10 Market Road',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
  phone: '9876543210',
  email: 'ops@example.test',
});

function App() {
  const [id, setId] = useState('WEB-1001');
  const [result, setResult] = useState('Responses will appear here.');
  const [batch, setBatch] = useState('');
  const [courierPartner, setCourier] = useState('mock');

  const call = async (
    path: string,
    options?: RequestInit,
  ) => {
    const response = await fetch(base + path, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const data = await response.json();

    setResult(JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw data;
    }

    return data;
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();

    await call('/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderId: id,
        courierPartner,

        invoiceNumber: `INV-${id}`,
        invoiceDate: new Date().toISOString().slice(0, 10),

        itemDescription: 'Cotton t-shirt',
        itemQuantity: 1,

        declaredValue: 499,
        paymentMode: 'PREPAID',
        collectableValue: 0,

        weightKg: 0.4,

        dimensionsCm: {
          length: 20,
          breadth: 15,
          height: 5,
        },

        shipper: address('Acme Store'),
        consignee: address('Riya Shah'),
        returnAddress: address('Acme Returns'),
      }),
    });
  };

  const track = async () => {
    await call(`/orders/${encodeURIComponent(id)}/track`);
  };

  const cancel = async () => {
    await call(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  };

  const checkBatch = async () => {
    await call(`/batches/${encodeURIComponent(batch)}`);
  };

  return (
    <main>
      <header>
        <h1>Courier Console</h1>
        <p>NestJS + MongoDB courier integration dashboard</p>
      </header>

      <section className="grid">
        <article>
          <h2>Create shipment</h2>

          <form onSubmit={create}>
            <label>
              Order ID
              <input
                value={id}
                onChange={(event) => setId(event.target.value)}
                required
              />
            </label>

            <label>
              Courier
              <select
                value={courierPartner}
                onChange={(event) =>
                  setCourier(event.target.value)
                }
              >
                <option value="mock">
                  Mock (local)
                </option>

                <option value="urbanebolt">
                  UrbaneBolt UAT
                </option>
              </select>
            </label>

            <button type="submit">
              Create shipment
            </button>
          </form>

          <pre>{result}</pre>
        </article>

        <aside>
          <h2>Manage shipment</h2>

          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="Order ID"
          />

          <div>
            <button
              type="button"
              onClick={track}
            >
              Track
            </button>

            <button
              type="button"
              className="danger"
              onClick={cancel}
            >
              Cancel
            </button>
          </div>

          <h2>Batch status</h2>

          <input
            placeholder="Batch ID"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
          />

          <button
            type="button"
            onClick={checkBatch}
          >
            Check batch
          </button>

          <p>
            Use <code>mock</code> locally.
            Configure MongoDB and UrbaneBolt credentials
            for integration testing.
          </p>
        </aside>
      </section>
    </main>
  );
}

createRoot(
  document.getElementById('root')!,
).render(
  <App />,
);