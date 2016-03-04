# localStorage

Enhanced localStorage to compatible with IE 6 / 6+ / FireFox / Chrome / Opera / Safri

# manual

    $.ajax({
        type: "post",
        headers: {'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
        url: '',
        dataType : '',
        data:params,
        async:false,
        localCache:true,    // use localStorage or not
        cacheTTL:0.2,       // Exp.date(per hour)
        isCacheValid:function(){return true;}    // localStorage is valid or not
    })
    ...
