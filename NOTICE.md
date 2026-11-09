# 署名及第三方资料说明

本工具2.1.0，修改与打包日期2026-11-09。界面、编译器及历日检索派生程序采用GNU GPL v3；完整条款见LICENSE。

ChineseCalendar原作者：Y. T. Liu。GPL-3.0，提交719e02ff011ab122aad5fb29084e3f6ee8b65390。https://github.com/ytliu0/ChineseCalendar

CeJS原作者：kanasimi，Copyright (c) 2022 kanasimi，BSD-3-Clause。提交0e10a9dffc1315c29f4e0868366bc0580a072c44。https://github.com/kanasimi/CeJS

OpenCC原作者及贡献者：BYVoid/OpenCC。Apache-2.0。https://github.com/BYVoid/OpenCC 。使用其TSCharacters字符表，添加纪年专名保留规则。

年度补充来源：维基百科贡献者，《中国年号列表》，2026-11-09获取。https://zh.wikipedia.org/wiki/中国年号列表 。作者与修订历史：https://zh.wikipedia.org/w/index.php?title=中国年号列表&action=history 。许可：Creative Commons Attribution-ShareAlike 4.0 International，https://creativecommons.org/licenses/by-sa/4.0/ 。

年度补充进行了HTML事实字段提取、简体检索映射、来源间去重、年度精度及疑伪标记；其整理结果year-supplement.js继续按CC BY-SA 4.0提供。该资料与程序各自保留许可。来源可能有遗漏或误记，不作任何作者背书声明。

原始上游许可证与资料分别保留于sources子文件夹。单文件HTML内也嵌入GNU GPL、BSD-3-Clause、Apache-2.0条款及本署名说明，脱离资料文件夹时仍能离线查看。

生日模块纳音逐项核对公版古籍《卜筮全书·六十甲子歌》，保留原书名称。所录公版古籍正文与规则说明见sources/birth-rules/。月令格局为明确标注的本气取格简法，附透干线索，不把它归为《六十甲子歌》所含的完整论命系统。

独立八字验证样例参考6tail/lunar-javascript公开测试中的日期与期望四柱事实，固定Git blob bef34c78a09b938b1b24df6e314cfce3875c1377；未引入或运行该库作为网页依赖。立春分钟边界同时核对香港天文台《2024年历》。出生输入只用于当前页面计算，不持久保存。
