module.exports = {
    "价钱": {
        "成本": 1,
        "预算": 1,
        "开销": 1,
        "花销": 1,
        "费用": 1,
        "价格":1,
        "报价":1,
        "收费": 1,
        "[0-9\\.][百千万元]": 1
    },
    "装修": {
        "装潢":1,
    },
    "材料":require("./材料"),
    "地点":require("./地点"),
    "类型":require("./类型"),
    "风格":require("./风格"),
    "特点":require("./特点"),
    "材质":require("./材质"),
    "品牌":require("./品牌"),
    "位置":require("./位置"),
    "设计":require("./设计"),
    "流程":require("./流程"),
    "房产":require("./房产"),
    "选材":{
        "建材":require("./建材"),
        "电工":require("./电工"),
        "(照明|灯具|灯光|灯)":require("./照明"),
        "厨卫":require("./厨卫"),
        "(家具|家俱)":require("./家具"),
        "(装饰|家饰)": require("./装饰"),
        "家电": require("./家电"),
        "家纺": require("./家纺"),
        "家居": require("./家居"),
        "硬装": require("./硬装"),
    },
    "百科":{
        "植物":require("./植物"),
        "动物":require("./动物"),
        "健身":require("./健身"),
        "办公": require("./办公"),
        "数码": require("./数码"),
        "养生": require("./养生"),
        "婚嫁": require("./婚嫁"),
        "词库": require("./词库")
    },
    "优缺点":{
        "优点":5,
        "缺点":5
    },
    "质量":1,
    "杂类": {
        "保养":6,
        "清洗":6,
        "安装":6,
        "制作":6,
        "拆卸":6
    }
}