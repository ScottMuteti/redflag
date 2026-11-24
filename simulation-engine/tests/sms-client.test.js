const mockSend = jest.fn();
jest.mock('africastalking', () => () => ({ SMS: { send: mockSend } }));

const { sendSms } = require('../src/integrations/africasTalking/smsClient');

const reply = (Recipients, Message = '') => ({ SMSMessageData: { Message, Recipients } });

describe('sendSms', () => {
  it('resolves when the recipient is accepted', async () => {
    mockSend.mockResolvedValue(reply([{ status: 'Success', statusCode: 101 }]));
    await expect(sendSms('+254700000101', 'hi')).resolves.toBeDefined();
  });

  it('rejects when AT refuses the recipient despite a 2xx reply', async () => {
    mockSend.mockResolvedValue(reply([{ status: 'InsufficientBalance', statusCode: 405 }]));
    await expect(sendSms('+254700000101', 'hi')).rejects.toThrow('InsufficientBalance');
  });

  it('rejects when AT returns no recipients', async () => {
    mockSend.mockResolvedValue(reply([], 'InvalidSenderId'));
    await expect(sendSms('+254700000101', 'hi')).rejects.toThrow('InvalidSenderId');
  });
});
