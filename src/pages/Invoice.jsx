import React, { useEffect, useState } from "react";
import {
  Card,
  Input,
  Button,
  Form,
  Row,
  Col,
  DatePicker,
  Select,
  Table,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import Swal from "sweetalert2";

import axios from "axios";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const URL = "https://localhost:7041/api";
const InvoicePage = () => {
  const [form] = Form.useForm();
  const [invoiceNo, setInvoiceNo] = useState();
  const [couriers, setCouriers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);

  const [details, setDetails] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [courierFee, setCourierFee] = useState(0);

  useEffect(() => {
    // load master data (adjust API URL)
    axios.get(`${URL}/Courier`).then((res) => setCouriers(res.data));
    axios.get(`${URL}/Sales`).then((res) => setSales(res.data));
    axios.get(`${URL}/Payment`).then((res) => setPayments(res.data));
  }, []);

  // calculate total dan kurir fee
  const courierFeeValue = Form.useWatch("courierID", form);
  useEffect(() => {
    if (courierFeeValue) {
      let sub = 0;
      let weight = 0;

      details.forEach((d) => {
        sub += d.qty * d.price;
        weight += d.weight * d.qty;
      });

      setSubtotal(sub);

      var findCourier = couriers.find((c) => c.courierID === courierFeeValue);

      if (!findCourier || !findCourier.courierFees) return;

      const fees = findCourier.courierFees;

      // ✅ 1. Try find matching range
      let fee = fees.find((cf) => weight >= cf.startKg && weight <= cf.endKg);

      // ✅ 2. If NOT found → handle edge cases
      if (!fee) {
        // sort by startKg
        const sortedFees = [...fees].sort((a, b) => a.startKg - b.startKg);

        if (weight < sortedFees[0].startKg) {
          // 🔽 BELOW MIN → use smallest
          fee = sortedFees[0];
        } else {
          // 🔼 ABOVE MAX → use largest
          fee = sortedFees[sortedFees.length - 1];
        }
      }

      console.log("Weight:", weight);
      console.log("Selected Fee:", fee);

      setCourierFee(fee.price);
    }
  }, [details, courierFeeValue]);

  const columns = [
    {
      title: "Item",
      render: (_, record, index) => <>{record.productName}</>,
    },
    {
      title: "Weight",
      render: (_, record, index) => <>{record.weight}</>,
    },
    {
      title: "Qty",
      render: (_, record, index) => <>{record.qty}</>,
    },
    {
      title: "Unit Price",
      render: (_, record, index) => <>{record.price}</>,
    },
    {
      title: "Total",
      render: (_, record) => record.qty * record.price,
    },
  ];

  const handleSubmit = async (values) => {
    if (!invoiceNo || invoiceNo == "") {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Invoice must be filled",
      });
      return;
    }
    const payload = {
      ...values,
      courierFee: courierFee,
    };
    try {
      await axios.put(`${URL}/Invoice/${invoiceNo}`, payload);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Invoice updated successfully!",
      });
    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update invoice",
      });
    }
    console.log("Submitted:", payload);
  };

  const deleteInvoice = async () => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the invoice!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${URL}/Invoice/${invoiceNo}`);

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Invoice has been deleted.",
      });

      // 🔥 CLEAR EVERYTHING
      form.resetFields();
      setDetails([]);
      setInvoiceNo("");
      setSubtotal(0);
      setCourierFee(0);
    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete invoice",
      });
    }
  };

  const findInvoice = async (invoiceNo) => {
    try {
      const res = await axios.get(`${URL}/Invoice/${invoiceNo}`);
      const data = res.data;

      if (!data) {
        throw new Error("Not found");
      }

      form.setFieldsValue({
        invoiceNo: data.invoiceNo,
        invoiceDate: dayjs(data.invoiceDate),
        invoiceTo: data.invoiceTo,
        shipTo: data.shipTo,
        salesID: data.salesID,
        courierID: data.courierID,
        paymentType: data.paymentType,
      });

      setDetails(
        data.details.map((d) => ({
          productName: d.productName,
          productID: d.productID,
          weight: d.weight,
          qty: d.qty,
          price: d.price,
        })),
      );
    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "warning",
        title: "Not Found",
        text: "Invoice not found!",
      });
    }
  };

  //HTML
  return (
    <Card>
      <div style={{ marginBottom: 20 }}>
        <Space>
          <Text strong>No Invoice</Text>
          <Input
            style={{ width: 250 }}
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
          <Button onClick={() => findInvoice(invoiceNo)}>View</Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        onFinish={handleSubmit}
      >
        <div
          style={{
            border: "1px solid gray",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "4px",
          }}
        >
          <Title level={5} style={{ color: "#1890ff", marginTop: 0 }}>
            Invoice Detail
          </Title>

          <Row gutter={24}>
            {/* Left Column */}
            <Col span={12}>
              <Form.Item name="invoiceDate" label="Invoice Date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item name="invoiceTo" label="To">
                <TextArea rows={4} />
              </Form.Item>
              <Form.Item name="salesID" label="Sales Name">
                <Select placeholder="Select Sales">
                  {sales.map((s) => (
                    <Option key={s.salesID} value={s.salesID}>
                      {s.salesName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="courierID" label="Courier">
                <Select placeholder="Select Courier">
                  {couriers.map((c) => (
                    <Option key={c.courierID} value={c.courierID}>
                      {c.courierName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Right Column */}
            <Col span={12}>
              <Form.Item name="shipTo" label="Ship To">
                <TextArea rows={4} />
              </Form.Item>
              <Form.Item name="paymentType" label="Payment Type">
                <Select placeholder="Cash/COD">
                  {payments.map((p) => (
                    <Option key={p.paymentID} value={p.paymentID}>
                      {p.paymentName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Table
          dataSource={details}
          columns={columns}
          pagination={false}
          rowKey={(r, i) => i}
          bordered
        />

        <Row justify="end" style={{ marginTop: 20 }}>
          <Col span={8}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text>Sub Total</Text>
              <Text>{subtotal.toLocaleString()}</Text>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px",
                marginBottom: 8,
              }}
            >
              <Text>Courier Fee</Text>
              <Text>{courierFee.toLocaleString()}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Title level={4}>Total</Title>
              <Title level={4}>
                {(subtotal + courierFee).toLocaleString()}
              </Title>
            </div>
          </Col>
        </Row>

        <div style={{ marginTop: 20 }}>
          <Space>
            <Button type="primary" size="large" htmlType="submit">
              SAVE
            </Button>
            {invoiceNo && courierFeeValue && (
              <Button danger onClick={() => deleteInvoice()}>
                Delete Invoice
              </Button>
            )}
          </Space>
        </div>
      </Form>
      <p style={{ color: "red" }}>
        *Kalkulasi kurir fee berdasarkan hasil akumulasi semua item, jika item
        weight total tidak ada yang sesuai dengan startKg dan endKg yang ada
        pada DB (ltcourierfee) maka jika min mengambil dari yang minimum dan
        jika max akan mengambil dari yang paling besar*
      </p>
    </Card>
  );
};

export default InvoicePage;
