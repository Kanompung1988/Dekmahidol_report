const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Events, 
  ChannelType, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
require('dotenv').config();

// ตรวจสอบว่าตัวแปรสำคัญใน .env ถูกตั้งค่าไว้หรือไม่
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('❌ โปรดตรวจสอบไฟล์ .env ว่ามีการตั้งค่าตัวแปร DISCORD_TOKEN, CLIENT_ID และ GUILD_ID ครบถ้วน');
  process.exit(1); // หยุดการทำงานหากตัวแปรสำคัญหายไป
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const commands = [
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('เปิด Ticket เพื่อติดต่อทีมงาน Dek Mahidol Report'),
].map(command => command.toJSON());

client.once(Events.ClientReady, async () => {
  console.log(`🎓 Dek Mahidol Report พร้อมให้บริการแล้ว!`);
  client.user.setPresence({
    activities: [{ name: 'รับรายงานจากนักศึกษา 📋', type: 0 }],
    status: 'online',
  });

  // ลงทะเบียน Slash Command
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ ลงทะเบียน /ticket สำเร็จ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
  }
});

let ticketCounter = 1; // ตัวนับ Ticket เริ่มต้น

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    const guild = interaction.guild;

    // สร้างชื่อ Ticket โดยใช้ตัวนับ
    const ticketNumber = ticketCounter.toString().padStart(4, '0'); // เติมเลข 0 ด้านหน้า เช่น 0001
    const ticketName = `ticket-${ticketNumber}`;

    const channel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: '1365379470747238461', // หมวดหมู่ที่ต้องการสร้าง Ticket
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ],
    });

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 ปิด Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({
      content: `🎫 สวัสดี <@${interaction.user.id}> ทีมงาน **Dek Mahidol Report** จะเข้ามาช่วยเหลือเร็วๆ นี้`,
      components: [row],
    });

    await interaction.reply({
      content: `✅ Ticket ของคุณถูกสร้างที่ <#${channel.id}>`,
      ephemeral: true,
    });

    ticketCounter++; // เพิ่มตัวนับ Ticket หลังจากสร้างเสร็จ
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const channel = interaction.channel;

    if (channel.name.startsWith('ticket-')) {
      await interaction.reply({
        content: '🔒 Ticket นี้กำลังจะถูกปิด...',
        ephemeral: true,
      });

      setTimeout(async () => {
        await channel.delete();
      }, 3000); // รอ 3 วินาทีก่อนลบช่อง
    } else {
      await interaction.reply({
        content: '❌ ไม่สามารถปิดช่องนี้ได้',
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);