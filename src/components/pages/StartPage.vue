<template>
  <div class="q-mx-auto q-my-xl column items-center justify-center">
    <img src="@/assets/umaine-dark.png" alt="UMaine Logo" class="q-mb-sm" width="550px" v-show="$q.dark.isActive"/>
    <img src="@/assets/umaine.png" alt="UMaine Logo" class="q-mb-sm" width="550px" v-show="!$q.dark.isActive"/>
    <h6 class="text-center text-h4 q-mb-none q-mt-lg text-bold">Text Annotation Review and Tagging (TART) Tool</h6>
    <h6 class="text-center text-h6 q-mb-none q-mt-xl text-italic">To Start, Open a File from the 'File' Menu</h6>
    <div style="position: absolute; bottom: 20px;font-size: 16px;">
      This research was supported in part by the U.S. Department of Agriculture through a National Institute of Food and Agriculture (NIFA) grant, Award #<a href="https://portal.nifa.usda.gov/web/crisprojectpages/1025810-cellulose-materials-informatics-building-a-knowledge-graph-for-cellulose-materials-discovery-and-research-cellograph.html" target="_blank">2021-67022-34366</a>
      <div class="q-mt-md row items-center justify-center">
        <img src="@/assets/skailabicon.png" style="height: 40px;padding-top: 2px;"/>
        <img src="@/assets/forestserviceicon.png" style="margin-left: 13px; height: 50px;"/>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: "StartPage",
  data() {
    return {
      textFile: null,
    };
  },
};
</script>
